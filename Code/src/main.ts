import "./style.css";
import { setupButton } from "./dm.js";

document.querySelector("#app")!.innerHTML = `
  <div>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
  </div>
`;

setupButton(document.querySelector("#counter")!);
