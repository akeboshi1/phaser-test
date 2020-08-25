import "phaser";
import TestWorker from "worker-loader?name=dist/[name].js!./TestWorker";
import { Base64, decode, encode } from "js-base64";
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
    "./src/index"
}

export class GameScene extends Phaser.Scene {
    private graphics: Phaser.GameObjects.Graphics;
    private rt: Phaser.GameObjects.RenderTexture;
    private worker: TestWorker;
    constructor() {
        super({ key: GameScene.name });
    }


    public create() {
        this.graphics = this.add.graphics();
        this.graphics.setVisible(false);

        this.rt = this.add.renderTexture(400, 300, 400, 400).setOrigin(0.5);
        this.worker = new TestWorker();
        const self = this;
        this.worker.onmessage = (event: any) => {
            self.onWorkerMessage(event.data);
        };
        // this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.png" });
        this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.json" });
    }

    public update() {
        // this.rt.camera.rotation -= 0.01;

        // this.rt.clear();

        // this.rt.draw(this.graphics);
    }

    private onWorkerMessage(data: any) {
        const self = this;
        const method = data.method;
        switch (method) {
            case "completeHandler":
                // const reader = new FileReader();
                // reader.addEventListener("loadend", function () {
                // reader.result 包含被转化为类型数组 typed array 的 blob
                // tslint:disable-next-line:no-console
                //     console.log(reader.result);
                //     const url: string = String(reader.result);
                //     self.textures.on("addtexture", () => {
                //         const img = self.make.image(undefined, true);
                //         img.setTexture("logo");
                //         img.x = 100;
                //         img.y = 100;
                //     }, this);
                //     self.textures.addBase64("logo", url);
                // canvas 方式
                // document.getElementById("testImg")
                //     .setAttribute(
                //         "src", String(reader.result)
                //     );
                // });
                const arr = [];
                arr.push(data.data);
                // tslint:disable-next-line:no-console
                console.log(data.data);
                // 由于会产生异步所以使用promise来限制回调
                const p = new Promise(function (resolve, reject) {
                    arr.forEach((val, index) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(val);
                        reader.onload = function (e) {
                            const resList = String(e.target.result).split(",");
                            resolve(resList[1]);
                            // arr2.push(e.target.result);
                            // // 当arr数组的元素个数与arr2数组的元素个数相等时证明已经全部转换完成
                            // if (arr2.length === arr.length) {
                            //     resolve(arr2);
                            // }
                        }
                    })
                })

                // base64转换完成时执行，将整个res（arr2）转换为JSON字符串
                p.then(function (res) {
                    const tmp = Base64.decode(String(res));
                    // tslint:disable-next-line:no-console
                    console.log(tmp);
                    // self.cache.json.add("logo", JSON.parse(tmp));
                    // tslint:disable-next-line:no-console
                    // console.log(JSON.parse(tmp));
                }, function (error) {

                })

                // reader.readAsDataURL(data.data);
                const objectURL = URL.createObjectURL(data.data);
                // tslint:disable-next-line:no-console
                // console.log(data.data+"====");
                this.load.image("logo", objectURL);
                break;
        }
    }

}

window.onload = () => {
    const game = new World();
};