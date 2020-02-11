import "phaser";
export class world {
    constructor() {
        const config = {
            type: Phaser.AUTO,
            parent: 'game',
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
    constructor() {
        super({ key: GameScene.name });
    }


    public create() {
        this.graphics = this.add.graphics();
        this.graphics.setVisible(false);

        this.drawStar(this.graphics, 200, 200, 5, 200, 100, 0xffff00);

        this.rt = this.add.renderTexture(400, 300, 400, 400).setOrigin(0.5);
    }

    public update() {
        // this.rt.camera.rotation -= 0.01;

        this.rt.clear();

        this.rt.draw(this.graphics);
    }

    private drawStar(graphics, cx, cy, spikes, outerRadius, innerRadius, color) {
        var rot = Math.PI / 2 * 3;
        var x = cx;
        var y = cy;
        var step = Math.PI / spikes;

        graphics.fillStyle(color, 1.0);
        graphics.beginPath();
        graphics.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            graphics.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            graphics.lineTo(x, y);
            rot += step;
        }

        graphics.lineTo(cx, cy - outerRadius);
        graphics.closePath();
        graphics.fillPath();
    }
}

window.onload = () => {
    var game = new world();
};