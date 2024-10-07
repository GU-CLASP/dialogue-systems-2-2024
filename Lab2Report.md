## Lab 2. LLMs for dialogue systems
### Flow of my experiment
Firstly, I add the question 'Why is the sky blue?' in advanced to messages array so that assistant can read and answer automatically. 
Assistant answered as following picture with json content from messages array. 

<img src="https://github.com/Braveoneone/dialogue-systems-2-2024/blob/main/Lab2Picture/3.png" width="600" height="300" alt="pic1">  

Second, I asked question of 'Who are you?' and the system recognised my question and replyed as following picture.  

<img src="https://github.com/Braveoneone/dialogue-systems-2-2024/blob/main/Lab2Picture/6.png" width="600" height="400" alt="pic2">  

### Exploration 
I download Ollama application and run 'ollama run gemma2' in command line. Then gemma2 let me 'Send a message (/? for help)'. I asked same question 'Why is the sky blue?'. The answer is as following.
```
The sky appears blue due to a phenomenon called **Rayleigh scattering**. 
Here's a simplified explanation:  
1. **Sunlight:** Sunlight is actually white, containing all colors of the rainbow.
2. **Atmosphere:** When sunlight enters the Earth's atmosphere, it collides with tiny air molecules (mainly nitrogen and oxygen).
3. **Scattering:** These molecules scatter the sunlight in all directions.  Blue light, having a shorter wavelength, gets scattered much 
more than other colors like red or orange.
4. **Our Perception:** As we look up at the sky, our eyes receive this scattered blue light from all directions, making the sky appear blue.
**Why not other colors?**
* **Violet light:**  While violet has an even shorter wavelength than blue and scatters more, our eyes are less sensitive to violet, so we 
perceive blue as the dominant color.
* **Red/Orange light:** These colors have longer wavelengths and are scattered less, which is why we see them more prominently at sunrise 
and sunset when sunlight travels through a thicker layer of atmosphere.

Let me know if you'd like a more detailed explanation or have any other questions!
```

#### We find that the difference between llama3.1 and gemma2 is that answers from gemma2 are more structured and gemma2 generate another answer from contrast perspective 'Why not'.
