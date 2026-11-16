export function createPodTab() {
  const element = document.createElement('div');
  element.className = 'dv-default-tab';
  const title = document.createElement('span');
  title.className = 'dv-default-tab-content';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'pod-close';
  close.textContent = '×';
  element.append(title, close);
  let subscription;
  return {
    element,
    init({ api }) {
      const render = () => {
        title.textContent = api.title;
        close.setAttribute('aria-label', `Close ${api.title}`);
        close.title = `Close ${api.title}`;
      };
      render();
      subscription = api.onDidTitleChange(render);
      close.onpointerdown = event => event.stopPropagation();
      close.onkeydown = event => event.stopPropagation();
      close.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        api.close();
      };
    },
    dispose() { subscription?.dispose(); }
  };
}
