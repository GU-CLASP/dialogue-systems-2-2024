# Report on lab 2
## Implementation details
In this experiment, I modified `dm.js` as instructed to facilitate ongoing interactions with LLMs. I tried different API call options (parameters) and topics. Additionally, I introduced a new rule for handling the *ASR_NOINPUT* condition: if the system doesn't hear input for 3 times, the dialogue automatically stops.

The primary model used in my experiment is *llama3.1*, deployed on mlt-gpu. However, after running `yarn dev`, I frequently encountered the error "*The AudioContext encountered an error from the audio device or the WebAudio renderer.*", which bothered me a lot.

## Explorations
I began by testing two classic questions: *How are you today?* and  *Why is the sky blue?*

For the first question, the model often responded like "*I'm just a computer program, so I don't have feelings or emotions like humans do. But thank you for asking! How can I assist you today?*" Even after adjusting parameters such as `temperature`, the model consistently assumed its **functional** role. However, when I followed up with something more personal, like "*I feel a little stressed, could you give me some advice on how to reduce my stress?*", it provided me considerate suggestions, which made it more human-like. In this scenario, dialogue proved more powerful than nonverbal communication.

For the second question, dialogue highlights its weakness compared to text communication. To answer a scientific query like this, the response tends to be long, complex, and difficult to follow in a spoken dialogue format. By adjusting API options like `top_p`, `top_k`, the response would be more creative and proactive, rather than simply listing several items.

I also asked the model to recommend me 3 books. Interestingly, it misunderstood my request due to a coincidence with the game IP *ME3 (Mass Effect 3)*, showcasing the potential for miscommunication in dialogues.

## Future plans
Due to time constraints and the unexpected AudioContext error, I have not yet fully explored the interaction with LLMs. Moving forward, I plan to experiment with more models, such as Gemma2 or ChatGPT, and learn how to deploy LLMs locally. Additionally, I am also interested in exploring how to parse the returned messages from LLMs. These insights will be beneficial for my final project and other future applications.
