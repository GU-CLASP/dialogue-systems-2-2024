import { AnyActorRef, assign, createActor, fromPromise, setup } from "xstate";
import { speechstate, SpeechStateExternalEvent } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings = {
  azureRegion: "northeurope",
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};

/* Grammar definition */
// interface Grammar {
//   [index: string]: { person?: string; day?: string; time?: string };
// }
// const grammar: Grammar = {
//   vlad: { person: "Vladislav Maraev" },
//   aya: { person: "Nayat Astaiza Soriano" },
//   rasmus: { person: "Rasmus Blanck" },
//   monday: { day: "Monday" },
//   tuesday: { day: "Tuesday" },
//   "10": { time: "10:00" },
//   "11": { time: "11:00" },
// };

/* Helper functions */
// function isInGrammar(utterance: string) {
//   return utterance.toLowerCase() in grammar;
// }

// function getPerson(utterance: string) {
//   return (grammar[utterance.toLowerCase()] || {}).person;
// }

/* Intoduce Message into context */
interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}

interface MyDMContext extends DMContext {
  noinputCounter: number;
  availableModels?: string[];
  messages: Message[];
}

interface DMContext {
  count: number;
  ssRef: AnyActorRef;
}
        
const dmMachine = setup({
  types: {} as {
    context: MyDMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" };
  },
  guards: {
    noinputCounterMoreThanTwo: ({ context }) => {
      if (context.noinputCounter > 2) {
        return true;
      } else {
        return false;
      }
    },
    noinputCounterMoreThanOne: ({ context }) => {
      if (context.noinputCounter > 1) {
        return true;
      } else {
        return false;
      }
    },
  },
  actions: {
    /* define your actions here */
    speechstate_prepare: ({ context }) =>
      context.ssRef.send({ type: "PREPARE" }),
    speechstate_listen: ({ context }) => context.ssRef.send({ type: "LISTEN" }),
    speechstate_speak: ({ context }, params: { value: string }) =>
      context.ssRef.send({ type: "SPEAK", value: { utterance: params.value } }),
    debug: () => console.debug("blabla"),
    assign_noinputCounter: assign(({ context }, params?: { value: number }) => {
      if (!params) {
        return { noinputCounter: context.noinputCounter + 1 };
      }
      return { noinputCounter: context.noinputCounter + params.value };
    }),
  },
  actors: {
    get_ollama_models: fromPromise<any, null>(async () => {
      return fetch("http://localhost:11434/api/tags").then((response) =>
        response.json()
      );
    }),
    fetchCompletions: fromPromise( 
      async ({ input }: { input: { messages: Message[] } }) => {
      const body = {
        model: "llama3.1",
        stream: false,
        /* adjust parameters */
        temperature: 0.9, // default 0.8;Increasing the temperature will make the model answer more creatively.
        top_k: 80, // default 40; A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative.
        top_p: 0.95, // default 0.9; Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. 
        messages: input.messages
      };
      console.log("Sending messages to Llama model:", body.messages); // Log the messages
      return fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
    })
}}).createMachine({
  context: ({ spawn }) => ({
    count: 0,
    ssRef: spawn(speechstate, { input: settings }),
    noinputCounter: 0,
    messages: [],
    // moreStuff: {thingOne: 1, thingTwo: 2}
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: [{ type: "speechstate_prepare" }],
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: {
        CLICK: "PromptAndAsk",
      },
    },
    PromptAndAsk: {
      initial: "GetModels",
      states: {
        GetModels: {
          invoke: {
            src: "get_ollama_models",
            input: null,
            onDone: {
              target: "Prompt",
              actions: assign(({ event }) => {
                console.log(event.output);
                return {
                  availableModels: event.output.models.map((m: any) => m.name),
                };
              }),
            },
            onError: {
              actions: () => console.error("no models available"),
            },
          },
        },
        Prompt: {
          entry: {
            type: "speechstate_speak",
            params: ({ context }) => ({
              value: `Hello world! Available models are: ${context.availableModels!.join(
                " "
              )} What can I do for you?`,
            }),
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          initial: "Choice",
          states: {
            Choice: {
              always: [
                { guard: "noinputCounterMoreThanTwo", target: "#DM.PromptAndAsk.Stopped" }, // add new check rule
                { guard: "noinputCounterMoreThanOne", target: "MoreThanOne" },
                { target: "LessThanOne" },
              ],
            },
            LessThanOne: {
              entry: {
                type: "speechstate_speak",
                params: { value: "I didn't hear you" },
              },
            },
            MoreThanOne: {
              entry: {
                type: "speechstate_speak",
                params: ({ context }) => {
                  return {
                    value: `I didn't hear you ${context.noinputCounter} times`,
                  };
                },
              },
            },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Stopped: {
          entry: {
            type: "speechstate_speak",
            params: { value: `I didn't hear you 3 times. I'm stopping now due to no input.`}, 
          },
          on: {
            SPEAK_COMPLETE: "#DM.Done" 
          },
        },
        Ask: {
          entry: [
            { type: "speechstate_listen" },
            () => console.log("Enter the Ask state, wait for user input...")
          ],
          on: {
            ASR_NOINPUT: {
              target: "NoInput",
              actions: { type: "assign_noinputCounter" },
            },
            RECOGNISED: {
              target: "CallLlama",
              actions: assign({
                messages: ({ context, event }) => {
                  console.log("Received event:", event); // 调试 event 的内容

                  // 确保提取的 utterance 不为 undefined
                  const userUtterance = (event as any)?.value?.[0]?.utterance;

                  if (!userUtterance) {
                    console.warn("Utterance is undefined, returning current messages.");
                    return context.messages // 如果没有 utterance，返回原来的 messages
                  }

                  console.log("Extracted utterance:", userUtterance);

                  // 返回一个有效的 Message 数组
                  return [
                    ...context.messages,
                    { role: "user", content: userUtterance } as Message,
                  ]
                }
              })
            },
          },
        },
        CallLlama: {
          invoke: {
            src: "fetchCompletions",
            input: ({ context }) => ({ messages: context.messages }),
            onDone: {
              actions: [
                assign({
                  messages: ({ context, event }) => [
                    ...context.messages,
                    { role: "assistant", content: event.output.message.content } as Message
                  ]
                }),
                () => console.log("Llama responded successfully, ready to speak..."),
                {
                  type: "speechstate_speak",
                  params: ({ event }) => ({
                    value: event.output.message.content,
                  }),
                },
              ],
              target: "WaitingForCallLlamaComplete",
            },
            onError: {
              actions: [
                {
                  type: "speechstate_speak",
                  params: { value: "Sorry, I'm having trouble calling Llama." },
                },
              ],
              target: "Ask",
            }
          },
        },
        WaitingForCallLlamaComplete: {
          on: {
            SPEAK_COMPLETE: "Ask"
          }
        },
      }
    },
    Done: {
      on: {
        CLICK: "PromptAndAsk",
      },
    },
    },
});

const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  /* if you want to log some parts of the state */
  console.debug(state.context);
});

export function setupButton(element: HTMLElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor.getSnapshot().context.ssRef.subscribe((snapshot) => {
    const meta = Object.values(snapshot.getMeta())[0];
    element.innerHTML = `${(meta as any).view}`;
  });
}
