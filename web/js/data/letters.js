// Letters and notices. html may be a function of the game state. Buttons return values to onChoose.
import { G, addStat } from '../game/state.js';
import { UI } from '../ui/ui.js';

const crest = (body, sig = 'Grant Holloway<br>VP, Acquisitions & Community Partnerships') => `
  <div class="corporate"><div class="logo">CRESTLINE PROPERTIES</div>${body}<p class="sign">Warm regards,<br><br>${sig}</p></div>`;

export const LETTERS = {
  rosa_will: {
    html: g => `<h2>A note, folded into the will</h2><div class="letter">
      Mija —<br><br>
      The shop is yours now, and the flat, and the cat (he will pretend he isn't).<br><br>
      Keep the lights on if you can. If you can't, that's alright too — I mean it. But try the Tuesday crowd first. They grow on you.<br><br>
      Everything important is written somewhere in my journal. Everything else is written on people.<br><br>
      All my love,<br>Abuela Rosa<br><br>
      P.S. Number three sticks. Kick it low, left side.</div>`,
    buttons: [{ label: 'Fold it into your pocket', value: true, primary: true }],
  },
  crestline_1: {
    html: g => crest(`<p>Dear ${g.name},</p><p>Please accept our sincere condolences on the passing of Ms. Rosa Alcántara, a true fixture of the Linden Street community.</p>
      <p>As you may know, Crestline is proud to be bringing <b>The Linden</b> — 212 thoughtfully designed residences — to the former Cap &amp; Seal site. We believe 118 Linden Street could play an exciting role in that future, and we would welcome the chance to discuss a partnership at your convenience.</p>
      <p>No pressure, of course. Take all the time you need.</p>`),
  },
  crestline_poster: {
    html: g => crest(`<p>Hi ${g.name},</p><p>Quick one! Our marketing team would love to place a tasteful "Coming Soon: The Linden" poster in your front window. In recognition of the visibility, Crestline would credit you <b>$120 per week</b>.</p>
      <p>It's a small way to show the neighborhood that change is coming — together.</p>`, 'Madison Park<br>Community Engagement Coordinator'),
    buttons: [{ label: 'Decline politely', value: 'no' }, { label: 'Accept the poster ($120/week)', value: 'yes', primary: true }],
    onChoose: async (v, app) => {
      if (v === 'yes') {
        G.flags.poster_deal = true;
        addStat('community', -8);
        UI.toast('A glossy poster goes up in the window. It looks very… clean.', 'icon_coin');
      } else {
        G.flags.poster_declined = true;
        addStat('community', 3);
        UI.toast('You drop the letter in the recycling. It feels good.', 'icon_heart');
      }
    },
  },
  crestline_offer: {
    html: g => crest(`<p>Dear ${g.name},</p><p>Following up on our earlier note, Crestline Properties is pleased to present a formal offer to purchase the property and business at 118 Linden Street:</p>
      <p style="text-align:center;font-size:1.4em"><b>$400,000</b></p>
      <p>This offer reflects our deep respect for the Alcántara family legacy. It will remain open until <b>September 28</b>. Should you accept, our team will handle everything, including the relocation of existing equipment and tenants.</p>
      <p>We'd hate for you to carry the weight of an aging building alone.</p>`),
  },
  tax: {
    html: g => `<div class="corporate"><div class="logo">CITY OF HARBORVIEW · ASSESSOR'S OFFICE</div>
      <p><b>NOTICE OF PROPERTY REASSESSMENT</b></p><p>Parcel: 118 LINDEN ST (ALCÁNTARA, R. — ESTATE)</p>
      <p>Due to significant new development in the surrounding area, the assessed value of the above parcel has been revised. Your property tax obligation will increase by <b>$75 per week</b>, effective immediately.</p>
      <p>This notice is informational. No action is required.</p></div>`,
  },
  hearing: {
    html: g => `<div class="corporate"><div class="logo">HARBORVIEW CITY COUNCIL</div>
      <p><b>PUBLIC HEARING — REZONING APPLICATION #2291 ("THE LINDEN, PHASE II")</b></p>
      <p>Applicant: Crestline Properties LLC. The application requests rezoning of parcels 110–124 Linden Street, including 118 Linden Street, for high-density residential use.</p>
      <p>Hearing: <b>Friday, September 26, 7:00 PM</b>, Council Chambers. Members of the public may speak for up to three minutes. Written petitions will be entered into the record.</p></div>`,
  },
  crestline_final: {
    html: g => crest(`<p>${g.name},</p><p>Our final offer for 118 Linden Street is <b>$750,000</b>, valid through today. I'll stop by this morning in person.</p>
      <p>Whatever you decide — and I do mean this — the building won't get any younger.</p>`),
  },
};
