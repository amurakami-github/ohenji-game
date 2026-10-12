import { SCENES } from './data.js';
import { SceneDeck } from './sequence.js';

// Open directly into a shuffled game. A scene link only sets its first turn.
export class Session {
  constructor({ firstScene, random = Math.random } = {}) {
    this.ids = SCENES.map(scene => scene.id);
    this.deck = new SceneDeck(this.ids, random);
    this.firstScene = this.ids.includes(firstScene) ? firstScene : null;
  }
  next() {
    if (this.firstScene) {
      const id = this.firstScene;
      this.firstScene = null;
      return this.deck.startAt(id);
    }
    return this.deck.next();
  }
}
