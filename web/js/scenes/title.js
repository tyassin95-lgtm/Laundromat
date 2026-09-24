// Title screen: Linden Street at night, in the rain, the laundromat glowing.
import { StreetScene } from './street.js';
import { Sound } from '../engine/audio.js';
import { damp } from '../engine/util.js';

export class TitleScene extends StreetScene {
  constructor(app) { super(app); this.name = 'title'; this.isTitle = true; }
  tm() { return 22 * 60 + 10; }
  wx() { return 'rain'; }

  async enter() {
    await super.enter({ loc: 'street' });
    this.player.visible = false;
    for (const a of this.npcs.values()) a.visible = false;
    this.npcs.clear();
    this.actors = [];
    this.rain.intensity = 0.75;
    this.r.cam.x = 560; this.r.cam.zoom = 1.08;
    this.drift = 0;
    Sound.setAmbience({ amb_rain_out: 0.55, amb_city: 0.2 }, 2);
    Sound.music('title', 2.5);
    this.app.hud.setMode('hidden');
  }

  exit() { super.exit(); this.r.cam.zoom = 1; }

  onTap() { /* the DOM menu handles input */ }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    this.rain.update(dt, this.r.VW, 700);
    this.drift += dt;
    const target = 870 - this.r.VW / 2 + Math.sin(this.drift * 0.05) * 60;
    this.r.cam.x = damp(this.r.cam.x, this.cameraClamp(target), 1.2, dt);
    this.r.cam.zoom = damp(this.r.cam.zoom, 1.05, 0.5, dt);
    if (Math.random() < dt * 0.05) { Sound.play('thunder_far', { vol: 0.25 }); this.flashT = 0.15; }
    if (this.flashT > 0) this.flashT -= dt;
  }

  draw() {
    super.draw();
    if (this.flashT > 0) this.r.fillScreen('#dfe8ff', this.flashT * 1.2);
    this.r.vignette(0.45);
  }
}
