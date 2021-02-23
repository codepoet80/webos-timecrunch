/*
    Time Crunch exercise app for webOS.
*/

function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

MainAssistant.prototype.setup = function() {

    //Workout List (starts empty)
    this.listElement = this.controller.get('workoutList');
    this.listInfoModel = {
        items: []
    };
    //Workout List templates (loads other HTML)
    this.template = {
        itemTemplate: 'main/item-template',
        listTemplate: 'main/list-template',
        swipeToDelete: false,
        renderLimit: 25,
        reorderable: false
    };
    this.controller.setupWidget('workoutList', this.template, this.listInfoModel);
    //Scroller
    this.scrollerModel = {
        mode: 'vertical',
        weight: 'light',
        friction: 'low'
    };
    this.controller.setupWidget('workoutScroller', {}, this.scrollerModel);
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            Mojo.Menu.editItem,
            { label: "Preferences", command: 'do-Preferences' },
            { label: "About", command: 'do-myAbout' }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);

    /* Always on Event handlers */
    Mojo.Event.listen(this.controller.get("workoutList"), Mojo.Event.listTap, this.handleListClick.bind(this));

    //Check for updates
    if (!appModel.UpdateCheckDone) {
        appModel.UpdateCheckDone = true;
        updaterModel.CheckForUpdate("Time Crunch", this.handleUpdateResponse.bind(this));
    }
};

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

MainAssistant.prototype.activate = function(event) {

    //Figure out if this is our first time
    if (appModel.AppSettingsCurrent["FirstRun"] || (appModel.AppSettingsCurrent["SenderName"] && appModel.AppSettingsCurrent["SenderName"].toLowerCase() == "webos user")) {
        appModel.AppSettingsCurrent["FirstRun"] = false;
        Mojo.Log.warn("Welcome screen not implemented!");
    }

    this.getWorkouts();
};

//Handle menu and button bar commands
MainAssistant.prototype.handleListClick = function(event) {
    Mojo.Log.info("Workout tapped: " + event.item.key);
    appModel.LastSelectedWorkout = event.item;
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.swapScene({ name: "detail", disableSceneScroller: false });
}

MainAssistant.prototype.handlePopupChoose = function(task, command) {
    Mojo.Log.info("Perform: ", command, " on ", task.uid);
    switch (command) {
        case "do-something":
            //do something
            break;
    }
}

MainAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-Preferences':
                //var stageController = Mojo.Controller.stageController;
                var stageController = Mojo.Controller.getAppController().getActiveStageController();
                stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox("Time Crunch - " + Mojo.Controller.appInfo.version, "Exercises for busy people, webOS edition. Copyright 2021, Jon Wise. Distributed under an MIT License.<br>Source code available at: https://github.com/codepoet80/webos-timecrunch");
                break;
        }
    }
};

//Handle mojo button taps
MainAssistant.prototype.handleClick = function(event) {
    //Nothing to do right now
}

//Send a request to Service to get chat messages
MainAssistant.prototype.getWorkouts = function() {
    //Load workout JSON into list
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "workouts.json");
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            this.updateWorkoutList(xmlhttp.responseText);
        }
    }.bind(this);

}

//Update the UI with search results from chat request
MainAssistant.prototype.updateWorkoutList = function(results) {

    var thisWidgetSetup = this.controller.getWidgetSetup("workoutList");
    thisWidgetSetup.model.items = [];
    var resultsObj = JSON.parse(results);
    //TODO: Error handling
    for (var i = 0; i < resultsObj.length; i++) {
        Mojo.Log.info("Adding workout: " + resultsObj[i].key);
        var newItem = resultsObj[i];
        newItem.exCount = newItem.exercises.length;
        newItem.exTime = (newItem.exercises.length * newItem.rest);
        for (var e = 0; e < newItem.exercises.length; e++) {
            newItem.exTime += newItem.exercises[e].time;
        }
        newItem.exTime = Math.round((newItem.exTime / 60) * 100) / 100;
        thisWidgetSetup.model.items.push(newItem);
    }
    this.controller.modelChanged(thisWidgetSetup.model);
}

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Log.info("Main scene deactivated " + Mojo.Controller.appInfo.id);

    //Detach UI
    Mojo.Event.stopListening(this.controller.get("workoutList"), Mojo.Event.listTap, this.handleListClick);
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
};