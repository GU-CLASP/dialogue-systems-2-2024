
# Table of Contents

1.  [Introduction](#org5c30816)
2.  [TypeScript](#org5f1a0b0)
    1.  [Why TypeScript](#orgcb76d91)
    2.  [Basic example](#org9b25999)
    3.  [Recap: defining functions with `const`.](#org83a627f)
    4.  [Now: Total TypeScript free book (Chapters 1-6)](#org8df84ad)
    5.  [Prettier](#orga912e78)
3.  [Implementing Dialogue systems 2 starter (now in TypeScript)](#org20bc6dd)
    1.  [Preparation](#org6824947)
    2.  [Fixing the TypeScript errors](#org653d39c)
4.  [SpeechState, XState (now with TypeScript)](#org0f8f317)
    1.  [Interaction with SpeechState](#org266592a)
    3.  [Actions](#org6265d1a)
    4.  [Assign action](#orgfd64286)



<a id="org5c30816"></a>

# Introduction

https://github.com/user-attachments/assets/687740e4-d856-4f6e-99b5-694f74a342b8




<a id="org5f1a0b0"></a>

# TypeScript


<a id="orgcb76d91"></a>

## Why TypeScript

-   Check if your code is correct before runnning it.
-   Power up your IDE (i.e. VSCode) with autocomplete and type-checking.
-   Have better control over your state machine.


<a id="org9b25999"></a>

## Basic example

-  Open the [JavaScript console](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Tools_and_setup/What_are_browser_developer_tools#the_javascript_console) in the    browser. For Firefox it is Cmd+Opt+I (macOS) or Control-Shift-K (Windows). 
-  Define a function that adds two numbers.
   ```javascript
   function add(a, b) {
       return a + b
   }
   ```
-  Now try to run it with different arguments, i.e. `add(1,2)`, `add(1,"2")`, `add(1)`, `add("1")`, `add()`, `add(1,false)`, `add(1,true)`, `add(1,{})`, `add(1, [])` etc.
-  Note the unexpected behaviour.
-  In this tutorial you will learn how to make the evaluation of such functions more predictable, by putting some restrictions during the compilation of your code.

<a id="org83a627f"></a>

## Recap: defining functions with `const`.

Next step will be to read the Total TypeScript book, but first: do you remember these 2 ways of defining functions?

   ```javascript
   function add(a, b) {
       return a + b
   }
   ```

essentially, is equivalent to 
```javascript
const add = (a, b) => {
       return a + b
   }
```

and even:
```javascript
const add = (a, b) => (a + b)   
```


<a id="org8df84ad"></a>

## Now: [Total TypeScript free book](https://www.totaltypescript.com/books/total-typescript-essentials/) (Chapters 1-6)

Please read the book carefully, and follow the examples. 
It will help you set up your development environment and learn essentials of TypeScript.

<a id="orga912e78"></a>

## Prettier

**Prettier** will make your code look much nicer and also help avoiding
errors, i.e. with balancing brackets. Enable it every time you save
your files. You can follow [this guide](https://www.digitalocean.com/community/tutorials/how-to-format-code-with-prettier-in-visual-studio-code) to enable it in VSCode.


<a id="org20bc6dd"></a>

# Implementing Dialogue systems 2 starter (now in TypeScript)

Our goal here is to get a working application based on from [Dialogue
Systems 1 starter code](https://github.com/GU-CLASP/dialogue-systems-1-2024/tree/main/Code), which was implemented in JavaScript. We are
going to turn it into TypeScript files and fix the errors.


<a id="org6824947"></a>

## Preparation

1.  We will start with by adding these files to en empty folder, defined in [XState template](https://stately.ai/docs/templates).
    
    `package.json`:
    
        {
          "name": "dm-demo",
          "private": true,
          "version": "0.0.0",
          "type": "module",
          "scripts": {
            "dev": "vite",
            "build": "tsc && vite build",
            "preview": "vite preview"
          },
          "devDependencies": {
            "typescript": "^5.5.4",
            "vite": "^5.3.5"
          },
          "dependencies": {
            "@statelyai/inspect": "^0.4.0",
            "speechstate": "^2.5.0",
            "xstate": "^5.18.0"
          },
          "packageManager": "yarn@3.6.4+sha256.7f7d51b38db0d94adf25c512e3f3d3b47d23c97922eecc540f7440f116bdb99a"
        }
    
    `tsconfig.json`:
    
        {
          "compilerOptions": {
            "target": "ESNext",
            "useDefineForClassFields": true,
            "module": "ESNext",
            "lib": ["ESNext", "DOM"],
            "moduleResolution": "Node",
            "strict": true,
            "resolveJsonModule": true,
            "isolatedModules": true,
            "esModuleInterop": true,
            "noEmit": true,
            "noUnusedLocals": true,
            "noUnusedParameters": true,
            "noImplicitReturns": true,
            "skipLibCheck": true
          },
          "include": ["src"]
        }
    
    `index.ts`:
    
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/svg+xml" href="/vite.svg" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Vite + TS</title>
          </head>
          <body>
            <div id="app"></div>
            <script type="module" src="/src/main.ts"></script>
          </body>
        </html>

2.  You can now install the dependencies:
    -   run `echo "nodeLinker: node-modules" > .yarnrc.yml` to use
        node-modules directory for storing dependencies (caused by some
        old dependency of SpeechState)
    
    -   run `yarn install` to install the dependencies

3.  Now create `src` folder and move `dm.js`, `main.js` from
    [Dialogue Systems 1 starter code](https://github.com/GU-CLASP/dialogue-systems-1-2024/tree/main/Code) there. Rename both `.js` files to
    `.ts`.

4.  Now let&rsquo;s look at the errors.


<a id="org653d39c"></a>

## Fixing the TypeScript errors

1.  `./src/main.ts`

    https://github.com/user-attachments/assets/2ef63507-1874-47df-8786-b175da72129e

3.  `./src/dm.ts`
    -   adding azure key

        https://github.com/user-attachments/assets/61f382a6-8d33-4ead-bb00-f3ef84cc7ae6
        
    -   typing global constants and functions

        https://github.com/user-attachments/assets/9c007738-37ba-41c5-8884-4322223c54dc
        
        https://github.com/user-attachments/assets/b65f6ee4-3164-4903-9b89-cc60a1a35444
        
    -   typing context and events

        https://github.com/user-attachments/assets/8a32dd3b-cda9-4674-83b9-0b7a7b35c50e

    -   Other errors:

        https://github.com/user-attachments/assets/e4681a78-50f5-499f-a861-e4ec8266adbe
        
    -   Fixing `Uncaught TypeError: snapshot.value.AsrTtsManager` aka getting SpeechState meta values

        https://github.com/user-attachments/assets/7a951435-1787-4477-b1ee-8b068bcbe6b9

       
4.  Now everything works!


<a id="org0f8f317"></a>

# SpeechState, XState (now with TypeScript)

[XState docs](https://stately.ai/docs/machines#machines-and-typescript)


<a id="org266592a"></a>

## Interaction with SpeechState

[
Sequence diagram](https://github.com/vladmaraev/speechstate?tab=readme-ov-file#sequence-diagrams)


<a id="org4b7ad1e"></a>

## Actions

It is nice to type actions as well, and define them in `setup()`:
[Actions & TypeScript](https://stately.ai/docs/actions#actions-and-typescript).




https://github.com/user-attachments/assets/8b8c4b24-cb26-4408-9a55-0cdb20687008

https://github.com/user-attachments/assets/fdc73a02-a590-4ae6-a4db-b2527d15295f

https://github.com/user-attachments/assets/efdec72f-f806-4579-a9c0-ed6cf2f6ef0c





<a id="orgfd64286"></a>

## Assign action

Remind yourself about the [Assign action](https://stately.ai/docs/actions#assign-action).

<a id="orga31dae3"></a>

## Exercise
Now, a small exercise:
1. Extend your context with `noinputCounter` that will count the times there was no input from the user.
2. Define an action in `setup()` that will increment the counter.
3. If there is no input, your program should say "I didn't hear you", and next time "I didn't hear you for the second time", etc. Note: You should get a suggestion of the SpeechState event that you are going to use from your text editor. 


