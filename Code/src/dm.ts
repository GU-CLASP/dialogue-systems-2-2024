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
interface Grammar {
  [index: string]: { person?: string; day?: string; time?: string };
}
const grammar: Grammar = {
  vlad: { person: "Vladislav Maraev" },
  aya: { person: "Nayat Astaiza Soriano" },
  rasmus: { person: "Rasmus Blanck" },
  monday: { day: "Monday" },
  tuesday: { day: "Tuesday" },
  "10": { time: "10:00" },
  "11": { time: "11:00" },
};

/* Helper functions */
function isInGrammar(utterance: string) {
  return utterance.toLowerCase() in grammar;
}

function getPerson(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).person;
}

interface MyDMContext extends DMContext {
  noinputCounter: number;
  availableModels?: string[];
  messages: Message[]; // Message context
}
interface DMContext {
  count: number;
  ssRef: AnyActorRef;
}
// Help maintain the history of your dialogue
interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}
const dmMachine = setup({
  types: {} as {
    context: MyDMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" };
  },
  guards: {
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
    //Following the instruction to create another actors
    get_new_actor: fromPromise<any, {message_list: Message[]}>(async ({input}) => { // TInput = NonReducibleUnknown, promiseCreator: ({ input,
        const body = {
          model: "llama3.1",
          stream: false,
          messages: input.message_list // Set input messages to itself
        };
        return fetch("http://localhost:11434/api/chat", {
          method: "POST",
          body: JSON.stringify(body),
        }).then((response) => response.json());
      }),
    },
}).createMachine({
  context: ({ spawn }) => ({
    count: 0,
    ssRef: spawn(speechstate, { input: settings }),
    noinputCounter: 0,
    messages: [{role: "system", content: "Let's start to chat!"}]
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
              actions: assign(({ event, context }) => {
                context.messages.push({role: "user"
                  , content: "why is the sky blue?"}); // First intention by manual input "Why is the sky blue?"
                console.log("[Output information GetModels]", event.output);
                console.log("[Messages information GetModels]", context.messages); // Json of messages 
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
              value: `Hello world! ${context.messages[0].content} Available models are: ${context.availableModels!.join(
                " "
              )}`,
            }),
          },
          on: { SPEAK_COMPLETE: "FetchCompl" },
        },
        FetchCompl: {
          invoke: {
            src: "get_new_actor",
            input: ({context}) => ({message_list: context.messages}),
            onDone: {
              target: "GetAnswer",
              actions: assign(({ event, context }) => {
                console.log("[Output information FetchCompl]", event.output);
                console.log("[Messages information FetchCompl]", context.messages); // Json of messages
                return {
                  messages: [
                    ...context.messages,
                    {role: "assistant", content: event.output.message.content }]
                };
                
              }),
            },
            onError: {
              actions: () => console.error("no models available"),
            },
          },
        },
        GetAnswer: {
          entry: {
            type: "speechstate_speak",
            params: ({ context }) => {
              console.log("[Messages information GetAnswer]", context.messages) // Json of messages
              return{ value: `Answer: ${context.messages[context.messages.length - 1].content} 
              )}`,}
            },
          },
          on: { SPEAK_COMPLETE: "AskQuestion" },
        },
        AskQuestion: {
          entry: {
            type: "speechstate_speak",
            params: () => ({
              value: `Please ask me a question!`,
            }),
          },
          
          on: { SPEAK_COMPLETE: "GetQuestionFromUser" },
        },
        GetQuestionFromUser: {
          entry: {
            type: "speechstate_listen",
          },
          on: {
            ASR_NOINPUT: {
              target: "NoInput",
              actions: { type: "assign_noinputCounter" },
            },
            RECOGNISED: {
              actions: [
                {
                  type: "speechstate_speak",
                  params: ({ event, context }) => {
                    const u = event.value[0].utterance;
                    context.messages.push({role: "user", content: u}); // Second attempt, get question from User
                    return {
                      value: `You just said: ${u}. I will think for a while and answer you`,
                    };
                   
                  },
                },
              ],
            },
            SPEAK_COMPLETE: "FetchCompl",
          },
        },
        NoInput: {
          initial: "Choice",
          states: {
            Choice: {
              always: [
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
          on: { SPEAK_COMPLETE: "#DM.Done" },
        },
      },
    },
    Done: {
      on: {
        CLICK: "PromptAndAsk",
      },
    },
  }
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
