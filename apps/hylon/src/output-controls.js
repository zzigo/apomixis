import './output-controls.css';
const ROUTES = {
  klais: { label:'K', title:'KLAIS · local sampler · recorded Klais layers' },
  audio: { label:'LA', title:'LOCAL AUDIO · local synthesizer' },
  midi: { label:'MO', title:'MIDI OUT · physical Klais organ · requires MIDI ON in I/O' }
};
export function decorateOutputControl(button, route, context='') {
  const info=ROUTES[route]; if(!info)return;
  button.classList.add('route-button');button.dataset.routeColor=route;button.textContent=info.label;
  button.title=`${context ? context+' · ' : ''}${info.title}`;button.setAttribute('aria-label',button.title);
}
