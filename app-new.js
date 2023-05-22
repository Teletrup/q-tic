import 'https://cdn.skypack.dev/preact/debug';
import {h, render} from 'https://cdn.skypack.dev/preact';
import {useReducer} from 'https://cdn.skypack.dev/preact/hooks'; //development version?
import htm from 'https://cdn.skypack.dev/htm';

const ht = htm.bind(h);

function update(state, msg) {
  const [action, data] = msg;
  switch (action) {
    case 'move':
      const [ox, oy, ix, iy] = data;
  }
}

function init(w, h) {
  const genOpenOcell = () => ({
    domain: null,
    content: Array.from(Array(3), () => Array.from(Array(3), () => null)),
  });
  return {
    board: Array.from(Array(h), () => Array.from(Array(w), genOpenOcell)),
  };
}

function drawIcell(send, icell, ox, oy, ix, iy) {
  const isDisabled = icell === 'disabled';
  return ht`
    <td class='inner-cell ${isDisabled ? 'disabled' : ''}' 
        onclick=${() => send(['move', [ox, oy, ix, iy]])}>
      ${isDisabled ? '' : icell}
    </>
  `;
}

function drawOcell(send, ocell, ox, oy) {
  return ht`
    <td class='outer-cell'>
    ${typeof(ocell.content) === 'string'
      ? ht`<span class='open-ocell'>ocell.content</>`
      : ht`
        <table class='inner-table'>
          ${ocell.content.map((row, iy) => ht`
            <tr>
              ${row.map((icell, ix) => drawIcell(send, icell, ox, oy, ix, iy))}
            </>
          `)}
        </>
        `
    }
    </>
  `;
}

function App(props) {
  const [state, send] = useReducer(update, init(13, 11));
  return ht`
    <table class='board'>
      ${state.board.map((row, oy) => ht`
        <tr>
          ${row.map((ocell, ox) => drawOcell(send, ocell, ox, oy))}
        </tr>
      `)}
    </>
  `;
}

render(ht`<${App} />`, document.body);
