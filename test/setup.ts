import { afterEach } from "vitest";

afterEach(() => {
  document.body.innerHTML = "";
  if (typeof localStorage?.clear === "function") {
    localStorage.clear();
  }
  if (typeof sessionStorage?.clear === "function") {
    sessionStorage.clear();
  }
});
