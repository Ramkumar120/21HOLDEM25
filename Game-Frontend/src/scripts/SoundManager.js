export default class SoundManager {
    constructor(oScene) {
        this.oScene = oScene;
        this.isSoundOn = true;
        this.isMusicOn = true;
        this.bg_music = this.oScene.sound.add('bg_music').setVolume(0.5);
        this.winAnimation_sound = this.oScene.sound.add('winAnimation_sound');
        this.winCoin_sound = this.oScene.sound.add('winCoin_sound');
        this.coin_sound = this.oScene.sound.add('coin_sound');
        this.card_sound = this.oScene.sound.add('card_sound');
        this.click_sound = this.oScene.sound.add('click_sound');
        this.bust_sound = this.oScene.sound.add('bust_sound');
        this.fold_sound = this.oScene.sound.add('fold_sound');
        this.timer_sound = this.oScene.sound.add('timer_sound');
        this.raise_sound = this.oScene.sound.add('raise_sound');
        this.check_sound = this.oScene.sound.add('check_sound');
    }
    playSound(key, loop = false) {
        if (this.isSoundOn) {
            key.play();
            key.loop = loop;
        }
    }
    playMusic(key, loop = false) {
        if (this.isMusicOn) {
            key.play();
            key.loop = loop;
        }
    }
    stopSound(key, loop = false) {
        key.loop = loop
        key.stop();
    }
}