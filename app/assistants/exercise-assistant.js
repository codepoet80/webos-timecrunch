function ExerciseAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

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
                    { label: 'Pause', iconPath: 'images/pause.png', command: 'do-pauseWorkout' }
                ]
            }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);
    //Loading spinner - with global members for easy toggling later
    this.spinnerAttrs = {
        spinnerSize: Mojo.Widget.spinnerLarge
    };
    this.spinnerModel = {
        spinning: false
    }
    this.controller.setupWidget('timerSpinner', this.spinnerAttrs, this.spinnerModel);

};

ExerciseAssistant.prototype.activate = function(event) {

    systemModel.PreventDisplaySleep();
    //Scale UI for orientation and listen for future orientation changes
    this.controller.window.addEventListener('resize', this.orientationChanged.bind(this)); //we have to do this for TouchPad because it does not get orientationChanged events
    this.orientationChanged();
    Mojo.Log.info("Loaded workout: " + JSON.stringify());
    this.startWorkout(appModel.LastSelectedWorkout);

    this.controller.get("divWorkoutTitle").innerHTML = appModel.LastSelectedWorkout.title;

};

//This is called by Mojo on phones, but has to be manually attached on TouchPad. Let's handle this system-wide (with a scene-specific callback)
ExerciseAssistant.prototype.orientationChanged = function(orientation) {
    systemModel.OrientationChanged(this.controller, this.scaleUI.bind(this));
};

//Callback for orientation change to calculate the right size for scene elements
ExerciseAssistant.prototype.scaleUI = function(orientation) {
    Mojo.Log.info("scaling for device type: " + systemModel.DeviceType);
    if (systemModel.DeviceType.toLowerCase() != "touchpad") {
        //For phones, it doesn't make sense to allow wide orientations
        //  But we need this for initial setup, so we'll force it to always be tall
        this.controller.stageController.setWindowOrientation("up");
        this.controller.get("imgExercise").className = "imgExercise Phone";
    } else {
        if (this.controller.window.screen.height < this.controller.window.screen.width) { //touchpad orientations are sideways from phones
            //wide
            this.controller.get("imgExercise").className = "imgExercise Wide";
        } else {
            //tall
            this.controller.get("imgExercise").className = "imgExercise Tall";
        }
    }

}

ExerciseAssistant.prototype.startWorkout = function(workout) {

    systemModel.PlayAlertSound("sounds/lets-get-started.mp3", 1100);

    this.exercises = workout.exercises;
    this.exerciseCount = 0;
    this.intervalTimer = null;
    this.interveralImage = null;

    this.firstExercise = this.exercises[0];
    this.controller.get("imgExercise").src = "images/get-ready.png";
    this.controller.window.setTimeout(function() { systemModel.PlayAlertSound("sounds/start-with-exercise.mp3", 1500) }.bind(this), 1500);
    this.controller.window.setTimeout(function() {
        var soundPath = "exercises/" + this.firstExercise.key + "/" + this.firstExercise.audio;
        systemModel.PlayAlertSound(soundPath, 1100);
    }.bind(this), 3500);
    this.startCountdownSpinner(10);
}

ExerciseAssistant.prototype.doNextExercise = function() {
    this.controller.window.clearInterval(this.interveralImage);

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
        systemModel.PlayAlertSound(soundPath, 1100);
        this.exerciseCount++;
    } else {
        systemModel.PlayAlertSound("sounds/workout-complete.mp3", 2400);
        this.controller.get("divWorkoutTitle").innerHTML = "Complete!";
        this.stopSpinner();
        this.controller.get("imgExercise").src = "images/great-job.png";
        this.controller.window.setTimeout(function() {
            systemModel.PlayAlertSound("sounds/you-did-it.mp3", 2100);
        }.bind(this), 2500);
        systemModel.AllowDisplaySleep();
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
    if (time == 4 && systemModel.DeviceType.toLowerCase() == "touchpad") {
        systemModel.PlayAlertSound("sounds/3second-countdown.mp3", 6000); //Work-around for TouchPad vibrate delay
    }
    if (time == 3 && systemModel.DeviceType.toLowerCase() != "touchpad") {
        systemModel.PlayAlertSound("sounds/3second-countdown.mp3", 6000);
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
    if (time == 4 && systemModel.DeviceType.toLowerCase() == "touchpad") {
        systemModel.PlayAlertSound("sounds/3second-countdown.mp3", 6000); //Work-around for TouchPad vibrate delay
    }
    if (time == 3 && systemModel.DeviceType.toLowerCase() != "touchpad") {
        systemModel.PlayAlertSound("sounds/3second-countdown.mp3", 6000);
    }
    if (time <= 0) {
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
    if (!skipRestAnnounce)
        systemModel.PlayAlertSound("sounds/take-a-rest.mp3", 6000);
    this.controller.get("divTimerValue").innerHTML = appModel.LastSelectedWorkout.rest || 3;
    this.intervalTimer = this.controller.window.setInterval(this.decrementRestSpinner.bind(this), 1000);
}

ExerciseAssistant.prototype.decrementRestSpinner = function() {
    var time = this.controller.get("divTimerValue").innerHTML;
    time = (time * 1) - 1;
    this.controller.get("divTimerValue").innerHTML = time;
    if (time == 6) {
        if (this.exerciseCount + 1 >= this.exercises.length)
            systemModel.PlayAlertSound("sounds/last-exercise.mp3", 6000);
        else
            systemModel.PlayAlertSound("sounds/next-exercise.mp3", 6000);
    }
    if (time == 4) {
        var soundPath;
        if (this.exerciseCount < this.exercises.length) {
            var nextExercise = this.exercises[this.exerciseCount];
            soundPath = "exercises/" + nextExercise.key + "/" + nextExercise.audio;
            this.controller.get("divWorkoutTitle").innerHTML = "Next Up: " + nextExercise.title;
            Mojo.Log.info("sound path: " + soundPath);
        }
        systemModel.PlayAlertSound(soundPath, 1100);
    }
    if (time == 1) {
        systemModel.PlayAlertSound("sounds/ding.mp3", 2100);
    }
    if (time <= 0) {
        this.controller.window.clearInterval(this.intervalTimer);
        this.doNextExercise();
    }
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

ExerciseAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Log.info("Main scene deactivated " + Mojo.Controller.appInfo.id);
    this.stopSpinner();
    this.controller.window.clearInterval(this.intervalTimer);
    this.controller.window.clearInterval(this.interveralImage);
    this.controller.get("imgExercise").src = "images/get-ready.png";

    //Detach UI
    this.controller.window.removeEventListener('resize', this.orientationChanged);
};

ExerciseAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
    var appController = Mojo.Controller.getAppController();
    appController.closeAllStages();
};