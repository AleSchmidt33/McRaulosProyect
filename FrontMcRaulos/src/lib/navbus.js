export const goTo = (path) => {
  try {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch {
    window.location.href = path;
  }
};
