import { AnyActorRef, assign, createActor, setup } from "xstate";
import { Settings, speechstate, SpeechStateExternalEvent } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  azureRegion: "northeurope",
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

interface DMContext {
  count: number;
  ssRef: AnyActorRef;
}
const dmMachine = setup({
  types: {} as {
    context: DMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" };
  },
  actions: {
    /* define your actions here */
    speechstate_prepare: ({ context }) =>
      context.ssRef.send({ type: "PREPARE" }),
    speechstate_listen: ({ context }) =>
      context.ssRef.send({
        type: "LISTEN",
      }),
    speechstate_speak: ({ context }, params: { value: string }) =>
      context.ssRef.send({
        type: "SPEAK",
        value: {
          utterance: params.value,
        },
      }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    count: 0,
    ssRef: spawn(speechstate, { input: settings }),
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: { type: "speechstate_prepare" },
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: {
        CLICK: "PromptAndAsk",
      },
    },
    PromptAndAsk: {
      initial: "Prompt",
      states: {
        Prompt: {
          entry: [
            { type: "speechstate_speak", params: { value: "Hello world!" } },
          ],
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "speechstate_listen" },
          on: {
            RECOGNISED: {
              actions: [
                {
                  type: "speechstate_speak",
                  params: ({ event }) => {
                    const isInGrammarStr = isInGrammar(event.value[0].utterance)
                      ? "is"
                      : "is not";
                    return { value: event.value[0].utterance };
                  },
                },
                ({ context, event }) =>
                  context.ssRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `You just said: ${
                        event.value[0].utterance
                      }. And it ${
                        isInGrammar(event.value[0].utterance) ? "is" : "is not"
                      } in the grammar.`,
                    },
                  }),
              ],
            },
            SPEAK_COMPLETE: "#DM.Done",
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
});

export function setupButton(element: HTMLElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor.getSnapshot().context.ssRef.subscribe((snapshot) => {
    const metaView = (Object.values(snapshot.getMeta())[0] as any).view;

    /// ["statename.substate", {view: "ready"}]

    element.innerHTML = `${metaView}`;
  });
}
