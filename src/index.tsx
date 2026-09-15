/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root mount element");

render(() => <App />, root);
