function ExerciseAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

/* Start of Lifecycle */
ExerciseAssistant.prototype.setup = function() {

    //Command Buttons
    this.cmdMenuAttributes = {
        spacerHeight: 0,
        menuClass: 'no-fade'
    };
    this.cmdMenuModel = {
        visible: true,
        items: [{
                items: [
                    { label: 'Back', icon: 'back', command: 'do-goBack' }
                ]
            },
            {
                items: [
                    { label: 'Pause', iconPath: 'images/pause.png', command: 'do-pauseWorkout', disabled: true }
                ]
            }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {};
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
    //Loading spinner - with global members for easy toggling later
    this.spinnerAttrs = {
        spinnerSize: Mojo.Widget.spinnerLarge
    };
    this.spinnerModel = {
        spinning: false
    }
    this.controller.setupWidget('timerSpinner', this.spinnerAttrs, this.spinnerModel);
    //Progress bar
    this.controller.setupWidget("progressWorkout",
        this.attributes = {
            modelProperty: "progress"
        },
        this.model = {
            progress: 0
        }
    );
};

ExerciseAssistant.prototype.activate = function(event) {
    this.playAudio();
    systemModel.PreventDisplaySleep();
    //Scale UI for orientation and listen for future orientation changes
    this.controller.window.addEventListener('resize', this.orientationChanged.bind(this)); //we have to do this for TouchPad because it does not get orientationChanged events
    this.orientationChanged();
    Mojo.Log.info("Loaded workout: " + appModel.LastSelectedWorkout.key);
    this.controller.get("divWorkoutTitle").innerHTML = appModel.LastSelectedWorkout.title;
    this.startWorkout(appModel.LastSelectedWorkout);
};

/* UI Event Handlers */

//This is called by Mojo on phones, but has to be manually attached on TouchPad. Let's handle this system-wide (with a scene-specific callback)
ExerciseAssistant.prototype.orientationChanged = function(orientation) {
    this.OrientationChanged(this.controller, this.scaleUI.bind(this));
}

//Used to normalize orientation between device types
ExerciseAssistant.prototype.OrientationChanged = function(controller, callback) {

    if (!controller) {
        var stageController = Mojo.Controller.getAppController().getActiveStageController();
        if (stageController) {
            controller = stageController.activeScene();
        }
    }
    if (!this.DeviceType)
        this.DeviceType = systemModel.DetectDevice();

    if (this.DeviceType != "TouchPad") {
        //For phones, it doesn't make sense to allow wide orientations
        //  But we need this for initial setup, so we'll force it to always be tall
        controller.stageController.setWindowOrientation("up");
        callback("tall")
    } else {
        if (controller.window.screen.height < controller.window.screen.width) { //touchpad orientations are sideways from phones
            callback("tall");
        } else {
            callback("wide");
        }
    }
};

//Callback for orientation change to calculate the right size for scene elements
ExerciseAssistant.prototype.scaleUI = function(orientation) {
    if (!this.orientation || this.orientation != orientation) {
        Mojo.Log.info("scaling for device type: " + systemModel.DetectDevice());
        this.orientation = orientation;
        if (systemModel.DetectDevice().toLowerCase() != "touchpad") { //Phones
            //For phones, it doesn't make sense to allow wide orientations
            //  But we need this for initial setup, so we'll force it to always be tall
            this.controller.stageController.setWindowOrientation("up");
            this.controller.get("imgExercise").className = "imgExercise Phone";
            if (systemModel.DetectDevice().toLowerCase() == "pre3") {
                Mojo.Log.info("top: " + this.controller.get("progressWorkout").style.top);
                this.controller.get("progressWorkout").style.top = "384px";
            }
            if (systemModel.DetectDevice().toLowerCase() == "tiny") {
                this.controller.get("divSpinnerContainer").style.marginTop = "0px";
                this.controller.get("divImageContainer").style.paddingTop = "-10px";
                this.controller.get("progressWorkout").style.top = "286px";
            }
        } else { //TouchPad
            if (this.controller.window.screen.height < this.controller.window.screen.width) { //touchpad orientations are sideways from phones
                //wide
                this.controller.get("imgExercise").className = "imgExercise Wide";
                this.controller.get("progressWorkout").style.width = "200px";
                this.controller.get("progressWorkout").style.left = "407px";
                this.controller.get("progressWorkout").style.top = "645px";
            } else {
                //tall
                this.controller.get("imgExercise").className = "imgExercise Tall";
                this.controller.get("progressWorkout").style.width = "200px";
                this.controller.get("progressWorkout").style.left = "280px";
                this.controller.get("progressWorkout").style.top = "905px";
            }
        }
    }
}

ExerciseAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-goBack':
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.pushScene({ name: "main", disableSceneScroller: false });
                break;
            case 'do-pauseWorkout':
                this.handlePlayPause();
                break;
        }
    }
};

ExerciseAssistant.prototype.handlePlayPause = function() {
    var thisWidgetSetup = this.controller.getWidgetSetup(Mojo.Menu.commandMenu);
    var pauseButton = this.cmdMenuModel.items[1].items[0];
    if (!this.paused) {
        Mojo.Log.info("Pausing...");
        this.pauseAudio();
        this.controller.get("divWorkoutTitle").innerHTML = "Paused";
        pauseButton.iconPath = "images/play.png";
        this.controller.window.clearInterval(this.intervalTimer);
        this.controller.window.clearInterval(this.interveralImage);
        this.controller.get("imgExercise").src = "images/rest.png";
        if (this.exerciseCount > 0)
            this.exerciseCount--;
        this.stopSpinner();
        this.paused = true;
    } else {
        Mojo.Log.info("Resuming next exercise...");
        this.controller.get("divWorkoutTitle").innerHTML = "Resuming";
        pauseButton.iconPath = "images/pause.png";
        this.controller.get("divTimerValue").innerHTML = appModel.LastSelectedWorkout.rest || 3;
        this.paused = false;
        this.startSpinner();
        this.takeARest(true);
    }
    this.controller.modelChanged(thisWidgetSetup.model);
}

/* Actual Workout Stuff */
ExerciseAssistant.prototype.startWorkout = function(workout) {
    this.exercises = workout.exercises;
    this.exerciseCount = 0;
    this.intervalTimer = null;
    this.interveralImage = null;

    this.firstExercise = this.exercises[0];
    this.controller.get("imgExercise").src = "images/get-ready.png";
    this.controller.window.setTimeout(function() {
        this.playAudio("sounds/start-with-exercise.mp3");
        this.startCountdownSpinner(10);
    }.bind(this), 2000);
    this.controller.window.setTimeout(function() {
        var soundPath = "exercises/" + this.firstExercise.key + "/" + this.firstExercise.audio;
        this.playAudio(soundPath);
        this.controller.get("divWorkoutTitle").innerHTML = "First up: " + this.firstExercise.title;
    }.bind(this), 4600);
}

ExerciseAssistant.prototype.doNextExercise = function() {
    this.controller.window.clearInterval(this.interveralImage);
    this.disablePauseButton(false);
    if (this.exerciseCount < this.exercises.length) {
        this.currentExercise = this.exercises[this.exerciseCount];
        Mojo.Log.info("Current Exercise: " + JSON.stringify(this.currentExercise));
        this.controller.get("divWorkoutTitle").innerHTML = this.currentExercise.title;

        this.startExerciseSpinner(this.currentExercise.time);

        this.currentImage = null;
        var imagePath = "exercises/" + this.currentExercise.key + "/" + this.currentExercise.images[0];
        this.controller.get("imgExercise").src = imagePath;

        if (Array.isArray(this.currentExercise.images) && this.currentExercise.images.length > 1) {
            this.currentImage = imagePath;
            this.interveralImage = this.controller.window.setInterval(this.toggleExerciseImage.bind(this), 1000);
        }
        //Announce exercise
        var soundPath = "exercises/" + this.currentExercise.key + "/" + this.currentExercise.audio;
        this.playAudio(soundPath);
        this.exerciseCount++;
    } else {
        this.finishWorkout();
    }
}

ExerciseAssistant.prototype.startCountdownSpinner = function(time) {
    var thisWidgetSetup = this.controller.getWidgetSetup("timerSpinner");
    var thisWidgetModel = thisWidgetSetup.model;
    thisWidgetModel.spinning = true;
    this.controller.setWidgetModel("timerSpinner", thisWidgetModel);
    this.controller.modelChanged(thisWidgetModel);

    this.controller.get("divTimer").style.display = "block";
    this.controller.get("divTimerValue").innerHTML = time;

    this.intervalTimer = this.controller.window.setInterval(this.decrementCountdownSpinner.bind(this), 1000);
}

ExerciseAssistant.prototype.decrementCountdownSpinner = function() {
    var time = this.controller.get("divTimerValue").innerHTML;
    time = (time * 1) - 1;
    this.controller.get("divTimerValue").innerHTML = time;
    if ((time == 4 && systemModel.DetectDevice().toLowerCase() == "touchpad") || (time == 3 && systemModel.DetectDevice().toLowerCase() != "touchpad")) {
        this.playAudio("sounds/3second-countdown.mp3");
    }
    if (time == 2) {
        var imagePath = "exercises/" + this.firstExercise.key + "/" + this.firstExercise.images[0];
        this.controller.get("imgExercise").src = imagePath;
    }
    if (time == 1 && this.firstExercise.images.length > 1) {
        var imagePath = "exercises/" + this.firstExercise.key + "/" + this.firstExercise.images[1];
        this.controller.get("imgExercise").src = imagePath;
    }
    if (time <= 0) {
        Mojo.Controller.getAppController().playSoundNotification("vibrate");
        this.controller.window.clearInterval(this.intervalTimer);
        this.doNextExercise();
    }
}

ExerciseAssistant.prototype.startExerciseSpinner = function(time) {
    var thisWidgetSetup = this.controller.getWidgetSetup("timerSpinner");
    var thisWidgetModel = thisWidgetSetup.model;
    thisWidgetModel.spinning = true;
    this.controller.setWidgetModel("timerSpinner", thisWidgetModel);
    this.controller.modelChanged(thisWidgetModel);

    this.controller.get("divTimer").style.display = "block";
    this.controller.get("divTimerValue").innerHTML = time;

    this.intervalTimer = this.controller.window.setInterval(this.decrementExerciseSpinner.bind(this), 1000);
}

ExerciseAssistant.prototype.decrementExerciseSpinner = function() {
    var time = this.controller.get("divTimerValue").innerHTML;
    time = (time * 1) - 1;
    this.controller.get("divTimerValue").innerHTML = time;
    if (time == 4 && systemModel.DetectDevice().toLowerCase() == "touchpad") {
        this.playAudio("sounds/3second-countdown.mp3")
    }
    if (time == 3 && systemModel.DetectDevice().toLowerCase() != "touchpad") {
        this.playAudio("sounds/3second-countdown.mp3")
    }
    if (time <= 0) {
        Mojo.Controller.getAppController().playSoundNotification("vibrate");
        this.controller.window.clearInterval(this.intervalTimer);
        if (this.exerciseCount >= this.exercises.length)
            this.doNextExercise();
        else
            this.takeARest();
    }
}

ExerciseAssistant.prototype.takeARest = function(skipRestAnnounce) {
    this.controller.window.clearInterval(this.interveralImage);
    this.controller.get("imgExercise").src = "images/rest.png";
    this.controller.get("divWorkoutTitle").innerHTML = "Take a Rest";

    this.updateProgressBar();

    if (!skipRestAnnounce) {
        this.controller.window.setTimeout(function() {
            this.playAudio("sounds/take-a-rest.mp3");
        }.bind(this), 200);
    }
    this.controller.get("divTimerValue").innerHTML = appModel.LastSelectedWorkout.rest || 3;
    this.intervalTimer = this.controller.window.setInterval(this.decrementRestSpinner.bind(this), 1000);
}

ExerciseAssistant.prototype.decrementRestSpinner = function() {
    var time = this.controller.get("divTimerValue").innerHTML;
    time = (time * 1) - 1;
    this.controller.get("divTimerValue").innerHTML = time;

    if (this.exerciseCount < this.exercises.length)
        var nextExercise = this.exercises[this.exerciseCount];

    if ((time == 8 && systemModel.DetectDevice().toLowerCase() == "touchpad") || (time == 7 && systemModel.DetectDevice().toLowerCase() != "touchpad")) {
        if (this.exerciseCount + 1 >= this.exercises.length)
            this.playAudio("sounds/last-exercise.mp3");
        else
            this.playAudio("sounds/next-exercise.mp3");
    }
    if ((time == 6 && systemModel.DetectDevice().toLowerCase() == "touchpad") || (time == 5 && systemModel.DetectDevice().toLowerCase() != "touchpad")) {

        var soundPath;
        if (nextExercise) {
            this.controller.get("divWorkoutTitle").innerHTML = "Next Up: " + nextExercise.title;
            var nextExercise = this.exercises[this.exerciseCount];
            soundPath = "exercises/" + nextExercise.key + "/" + nextExercise.audio;
            this.playAudio(soundPath);
        }
    }
    if ((time == 4 && systemModel.DetectDevice().toLowerCase() == "touchpad") || (time == 3 && systemModel.DetectDevice().toLowerCase() != "touchpad")) {
        if (nextExercise) {
            var imagePath = "exercises/" + nextExercise.key + "/" + nextExercise.images[0];
            this.controller.get("imgExercise").src = imagePath;
        }
    }
    if ((time == 3 && systemModel.DetectDevice().toLowerCase() == "touchpad") || (time == 2 && systemModel.DetectDevice().toLowerCase() != "touchpad")) {
        if (nextExercise) {
            var imagePath = "exercises/" + nextExercise.key + "/" + nextExercise.images[nextExercise.images.length - 1];
            this.controller.get("imgExercise").src = imagePath;
        }
    }
    if ((time == 2 && systemModel.DetectDevice().toLowerCase() == "touchpad") || (time == 1 && systemModel.DetectDevice().toLowerCase() != "touchpad")) {
        this.playAudio("sounds/ding.mp3");
        if (nextExercise) {
            var imagePath = "exercises/" + nextExercise.key + "/" + nextExercise.images[0];
            this.controller.get("imgExercise").src = imagePath;
        }
    }
    if (time <= 0) {
        Mojo.Controller.getAppController().playSoundNotification("vibrate");
        this.controller.window.clearInterval(this.intervalTimer);
        this.doNextExercise();
    }
}

ExerciseAssistant.prototype.finishWorkout = function() {
    this.playAudio("sounds/workout-complete.mp3");
    this.controller.get("divWorkoutTitle").innerHTML = "Complete!";
    this.updateProgressBar(true);
    this.stopSpinner();
    this.controller.get("imgExercise").src = "images/great-job.png";
    this.controller.window.setTimeout(function() {
        this.playAudio("sounds/you-did-it.mp3");
        Mojo.Controller.getAppController().playSoundNotification("vibrate");
    }.bind(this), 2500);
    systemModel.AllowDisplaySleep();
    this.disablePauseButton(true);
}

/* End of Lifecycle */
ExerciseAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Log.info("Main scene deactivated " + Mojo.Controller.appInfo.id);
    this.controller.window.clearInterval(this.intervalTimer);
    this.controller.window.clearInterval(this.interveralImage);
    this.controller.get("imgExercise").src = "images/get-ready.png";
    this.pauseAudio();

    //Detach UI
    this.controller.window.removeEventListener('resize', this.orientationChanged);
};

ExerciseAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
    var appController = Mojo.Controller.getAppController();
    appController.closeAllStages();
};

/* Helper Functions */
ExerciseAssistant.prototype.playAudio = function(soundPath) {
    var audioPlayer = this.controller.get("audioPlayer");
    audioPlayer.pause();
    this.libs = MojoLoader.require({ name: "mediaextension", version: "1.0"});
    this.audioExt = this.libs.mediaextension.MediaExtension.getInstance(audioPlayer);
    this.audioExt.audioClass = "feedback";     //defaultapp, media, feedback, ringtone;
    if (soundPath) {
        Mojo.Log.info("trying to play audio: " + soundPath);
        audioPlayer.src = soundPath;
        audioPlayer.load();
    }
    audioPlayer.play();
}

ExerciseAssistant.prototype.pauseAudio = function() {
    var audioPlayer = this.controller.get("audioPlayer");
    audioPlayer.pause();
}

ExerciseAssistant.prototype.disablePauseButton = function(disabled) {

    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        var thisWidgetSetup = this.controller.getWidgetSetup(Mojo.Menu.commandMenu);
        var thisWidgetModel = thisWidgetSetup.model;
        thisWidgetModel.items[1].items[0].disabled = disabled;
        this.controller.modelChanged(thisWidgetModel);
    }
}

ExerciseAssistant.prototype.startSpinner = function(time) {
    var thisWidgetSetup = this.controller.getWidgetSetup("timerSpinner");
    var thisWidgetModel = thisWidgetSetup.model;
    thisWidgetModel.spinning = true;
    this.controller.setWidgetModel("timerSpinner", thisWidgetModel);
    this.controller.modelChanged(thisWidgetModel);
    this.controller.get("divTimer").style.display = "block";
}

ExerciseAssistant.prototype.stopSpinner = function(time) {
    var thisWidgetSetup = this.controller.getWidgetSetup("timerSpinner");
    var thisWidgetModel = thisWidgetSetup.model;
    thisWidgetModel.spinning = false;
    this.controller.setWidgetModel("timerSpinner", thisWidgetModel);
    this.controller.modelChanged(thisWidgetModel);

    this.controller.get("divTimer").style.display = "none";
    this.controller.get("divTimerValue").innerHTML = "0";
}

ExerciseAssistant.prototype.toggleExerciseImage = function() {
    if (this.currentExercise.images.length > 0) {
        var imagePath = "exercises/" + this.currentExercise.key + "/" + this.currentExercise.images[1];
        if (this.currentImage == imagePath)
            imagePath = "exercises/" + this.currentExercise.key + "/" + this.currentExercise.images[0];
        this.currentImage = imagePath;
        this.controller.get("imgExercise").src = imagePath;
    }
}

ExerciseAssistant.prototype.updateProgressBar = function(done) {
    Mojo.Log.info("% done: " + (this.exerciseCount / this.exercises.length));
    var thisWidgetSetup = this.controller.getWidgetSetup("progressWorkout");
    var thisWidgetModel = thisWidgetSetup.model;
    thisWidgetModel.progress = (this.exerciseCount / this.exercises.length);
    if (done)
        thisWidgetModel.progress = 1;
    this.controller.setWidgetModel("progressWorkout", thisWidgetModel);
    this.controller.modelChanged(thisWidgetModel);
}