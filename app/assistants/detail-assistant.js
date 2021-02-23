function DetailAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

DetailAssistant.prototype.setup = function() {

    //Workout List (starts empty)
    this.listElement = this.controller.get('exerciseList');
    this.listInfoModel = {
        items: []
    };
    //Workout List templates (loads other HTML)
    this.template = {
        itemTemplate: 'detail/item-template',
        listTemplate: 'detail/list-template',
        swipeToDelete: true,
        reorderable: true
    };
    this.controller.setupWidget('exerciseList', this.template, this.listInfoModel);
    //Scroller
    this.scrollerModel = {
        mode: 'vertical',
        weight: 'light',
        friction: 'low'
    };
    this.controller.setupWidget('exerciseScroller', {}, this.scrollerModel);
    //Loading spinner - with global members for easy toggling later
    this.spinnerAttrs = {
        spinnerSize: Mojo.Widget.spinnerLarge
    };
    this.spinnerModel = {
        spinning: true
    }
    this.controller.setupWidget('workingSpinner', this.spinnerAttrs, this.spinnerModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {};
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);
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
                    { label: 'Shuffle', iconPath: 'images/shuffle.png', command: 'do-shuffle' },
                    { label: 'Start', iconPath: 'images/play.png', command: 'do-startWorkout' }
                ]
            }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);

    /* Always on Event handlers */
    Mojo.Event.listen(this.controller.get("exerciseList"), Mojo.Event.listTap, this.handleListClick.bind(this));
    Mojo.Event.listen(this.controller.get("exerciseList"), Mojo.Event.listReorder, this.handleListReorder.bind(this));
    Mojo.Event.listen(this.controller.get("exerciseList"), Mojo.Event.listDelete, this.handleListDelete.bind(this));

};

DetailAssistant.prototype.activate = function(event) {

    this.updateExerciseList(appModel.LastSelectedWorkout);
};


DetailAssistant.prototype.handleListClick = function(event) {
    appModel.LastMessageSelected = event.item;
    Mojo.Log.info("Exercise tapped: " + event.item.key)
}

DetailAssistant.prototype.handleListReorder = function(event) {
    var thisTaskList = this.controller.getWidgetSetup("exerciseList");
    var items = thisTaskList.model.items;
    items.move(event.fromIndex, event.toIndex);
    Mojo.Log.info("Item moved: " + event.fromIndex + ", " + event.toIndex);
}

DetailAssistant.prototype.handleListDelete = function(event) {
    var thisTaskList = this.controller.getWidgetSetup("exerciseList");
    var items = thisTaskList.model.items;
    items.delete(event.item);
    Mojo.Log.info("Item deleted: " + event.item.key);
}

DetailAssistant.prototype.handleCommand = function(event) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-goBack':
                stageController.swapScene({ name: "main", disableSceneScroller: false });
                break;
            case 'do-shuffle':
                var thisWidgetSetup = this.controller.getWidgetSetup("exerciseList");
                thisWidgetSetup.model.items.shuffle()
                this.controller.modelChanged(thisWidgetSetup.model);
                break;
            case 'do-startWorkout':
                var thisWidgetSetup = this.controller.getWidgetSetup("exerciseList");
                appModel.LastSelectedWorkout.exercises = thisWidgetSetup.model.items;
                stageController.swapScene({ name: "exercise", disableSceneScroller: false });
                break;
        }
    }
};

//Handle mojo button taps
DetailAssistant.prototype.handleClick = function(event) {

    //Nothing to do right now
}

//Update the UI with search results from chat request
DetailAssistant.prototype.updateExerciseList = function(workout) {

    var exercises = workout.exercises;

    var thisWidgetSetup = this.controller.getWidgetSetup("exerciseList");
    thisWidgetSetup.model.items = [];
    Mojo.Log.info("Exercises: " + JSON.stringify(exercises));

    for (var i = 0; i < exercises.length; i++) {
        Mojo.Log.info("Adding exercise: " + exercises[i].key);
        thisWidgetSetup.model.items.push(exercises[i]);
        this.getExerciseDetail(exercises[i].key, this.updateExerciseDetail.bind(this));
    }
    this.controller.modelChanged(thisWidgetSetup.model);
}

DetailAssistant.prototype.getExerciseDetail = function(exerciseKey, callback) {
    //Load workout JSON into list
    var exerciseFile = "exercises/exercises.json";
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", exerciseFile);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            callback(xmlhttp.responseText);
        }
    }.bind(this);

}

DetailAssistant.prototype.updateExerciseDetail = function(response) {

    var thisWidgetSetup = this.controller.getWidgetSetup("exerciseList");
    //Mojo.Log.info("Exercise detail: " + response);
    var responseObj = JSON.parse(response);
    //TODO: Error handling
    for (var i = 0; i < responseObj.length; i++) {
        for (var j = 0; j < thisWidgetSetup.model.items.length; j++) {
            if (thisWidgetSetup.model.items[j].key == responseObj[i].key) {
                var useTime = thisWidgetSetup.model.items[j].time;
                thisWidgetSetup.model.items[j] = responseObj[i];
                if (useTime)
                    thisWidgetSetup.model.items[j].time = useTime;
                else
                    thisWidgetSetup.model.items[j].time = thisWidgetSetup.model.items[j].defaultTime
            }
        }
    }
    this.controller.modelChanged(thisWidgetSetup.model);
    //Remove loading spinner
    this.controller.get("divSpinnerContainer").style.display = "none";
    this.controller.get("showExerciseList").style.display = "block";
}

DetailAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Log.info("Main scene deactivated " + Mojo.Controller.appInfo.id);

    //Detach UI
    Mojo.Event.stopListening(this.controller.get("exerciseList"), Mojo.Event.listTap, this.handleListClick);
};

DetailAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};

/* Helper Functions */
Array.prototype.move = function(from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
};

Array.prototype.delete = function(item) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === item) {
            this.splice(i, 1);
        }
    }
}

Array.prototype.shuffle = function() {
    for (var i = this.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = this[i];
        this[i] = this[j];
        this[j] = temp;
    }
}