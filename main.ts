import "phaser";
// import TestWorker from "worker-loader?name=dist/[name].js!./TestWorker";
// import { Base64, decode, encode } from "js-base64";
import { WorkerControl } from "./src/workerControl";
import { Inject } from "common-injector";
export class World {
    constructor() {
        const config = {
            type: Phaser.AUTO,
            parent: "game",
            width: 800,
            height: 600,
            backgroundColor: "#000033"
        };
        const game: Phaser.Game = new Phaser.Game(config);
        game.scene.add(GameScene.name, GameScene);
        game.scene.start(GameScene.name);
    }
}

export class GameScene extends Phaser.Scene {
    private graphics: Phaser.GameObjects.Graphics;
    private rt: Phaser.GameObjects.RenderTexture;
    @Inject() private workerControl: WorkerControl;
    constructor() {
        super({ key: GameScene.name });
    }


    public create() {
        this.graphics = this.add.graphics();
        this.graphics.setVisible(false);

        this.rt = this.add.renderTexture(400, 300, 400, 400).setOrigin(0.5);
        this.workerControl = new WorkerControl();
        this.workerControl.startHandler();
        // this.worker = new TestWorker();
        // const self = this;
        // this.worker.onmessage = (event: any) => {
        //     self.onWorkerMessage(event.data);
        // };
        // // this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.png" });
        // this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.json" });
    }

    public update() {
        // this.rt.camera.rotation -= 0.01;

        // this.rt.clear();

        // this.rt.draw(this.graphics);
    }

}

window.onload = () => {
    const game = new World();
};