import "phaser";
import MainWorker from "worker-loader?name=dist/[name].js!./MainWorker";
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
    // @Inject() private workerControl: WorkerControl;

    private mainWorker: Worker;

    constructor() {
        super({ key: GameScene.name });
    }

    public preload() {
        this.load.image("bubble", "./resource/bubblebg.png");

        this.mainWorker = new MainWorker();
        this.mainWorker.postMessage("init");
        this.mainWorker.onmessage = (e) => {
            // tslint:disable-next-line:no-console
            console.log("Main got message <" + e.data + ">");
        };
    }

    public create() {
        this.graphics = this.add.graphics();
        this.graphics.setVisible(false);

        this.rt = this.add.renderTexture(400, 300, 400, 400).setOrigin(0.5);

        const imgBtn1 = this.add.image(200, 150, "bubble");
        imgBtn1.setInteractive();
        imgBtn1.once("pointerup", () => {
            // tslint:disable-next-line:no-console
            console.log("pointerup ; start test");
            this.mainWorker.postMessage("register");
        });
        const imgBtn2 = this.add.image(300, 150, "bubble");
        imgBtn2.setInteractive();
        imgBtn2.once("pointerup", () => {
            // tslint:disable-next-line:no-console
            console.log("pointerup ; start test");
            this.mainWorker.postMessage("start");
        });

        // this.workerControl = new WorkerControl();
        // this.workerControl.startHandler();
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