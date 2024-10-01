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



interface Message {
  role: "assistant" | "user" | "system";
  content: string;
} ; 

/* Helper functions */
function isInGrammar(utterance: string) {
  return utterance.toLowerCase() in grammar;
}
function getRandomFromList(list: string[]): string {
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}
function getPerson(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).person;
}

interface MyDMContext extends DMContext {
  noinputCounter: number;
  availableModels?: string[];

}
interface DMContext {
  count: number;
  ssRef: AnyActorRef;
  messages: Message[] ;
  prompt? :string ;
  noInput : string[] ;
}
const dmMachine = setup({
  types: {} as {
    context: MyDMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" };
  },
  guards: {
    noinputCounterMoreThanThree: ({ context }) => {
      if (context.noinputCounter === 3) {
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
    debug: (event) => console.debug(event),
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
    LLMActor: fromPromise<any,{prompt:Message[]}>(async ({input})=> {
      const body = {
        model: "llama3.1",
        messages : input.prompt,
        stream: false,
      };
      return fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
   } ), 
  }
}).createMachine({
  context: ({ spawn }) => ({
    count: 0,
    messages: [],
    ssRef: spawn(speechstate, { input: settings }),
    noinputCounter: 0,
    noInput  : ["I didn't hear you.", "Are you there?", "Bestie answer me.","Why aren't you answering?"],
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
          invoke: {
            src: "LLMActor",
            input: ({}) => ({ prompt: [{ role: "user", content: "Hi" }] }),
            onDone: {
              target: "Answer",
              actions: [
                //({ event }) => console.log(event.output.message.content),
                assign(({ context, event }) => {
                  return {
                    messages: [
                      ...context.messages,
                      {
                        role: "assistant",
                        content: event.output.message.content,
                      },
                    ],
                  };
                }),
              ],
            },
          },
        },
        Answer : {
          entry: {
          type: "speechstate_speak",
          params: ({ context }) => {
              const utterance = context.messages[context.messages.length - 1];
              return {
              value: `${utterance.content}`,
            };
        }
        }, 
        on: { SPEAK_COMPLETE: "Listen" },
      },
      Listen : {
        entry: {
          type: "speechstate_listen",
        },
        on : {
          RECOGNISED : { 
            actions : [
              assign(({context,event}) => {
                return {
                  messages: [...context.messages, {
                    role : "user",
                    content : event.value[0].utterance
                  }
                   ],
                } ;
              }),
              assign(({context})=> {
                return {
                  noinputCounter: context.noinputCounter = 0
                }
              } ) 
            ],
          target: "Loop"  
          },
          ASR_NOINPUT : {
            target: "NoInput"
          }
        }
      },
      Loop: {
        invoke: {
          src: "LLMActor",
          input: ({context}) => ({ prompt: context.messages }),
          onDone: {
            target: "Answer",
            actions: [
              //({ event }) => console.log(event.output.message.content),
              assign(({ context, event }) => {
                return {
                  messages: [
                    ...context.messages,
                    {
                      role: "assistant",
                      content: event.output.message.content,
                    },
                  ],
                };
              }),
            ],
          },
        },
      },
      NoInput : {
              always: [
                { guard: "noinputCounterMoreThanThree", target: "#DM.Done" },
                { target: "ChooseNoInput" },
              ],
            },
        ChooseNoInput : {
        invoke: {
          src: "LLMActor",
          input: ({context}) => ({ prompt: [{ role: "assistant", content: getRandomFromList(context.noInput) }] }),
          onDone: {
            target: "Answer",
            actions: [
              assign(({ context, event }) => {
                return {
                  messages: [
                    ...context.messages,
                    {
                      role: "assistant",
                      content: event.output.message.content },
                      
                  ],
                };
              }),
              { type: "assign_noinputCounter" }
            ],
          },
        },
      },
    },
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
