function VersionAssistant(startup) {
    this.isStartup = startup;

    // on first start, this message is displayed, along with the current version message from below
    this.startupMessage = Mojo.Controller.appInfo.startupMessage;

    //New Features
    this.changelog = [{
            version: "Version 1.5.1",
            detail: [
                "Dark theme now available in main scene's menu!",
            ]
        },{
            version: "Version 1.5.0",
            detail: [
                "Adds new exercises and routines -- don't skip leg day!",
            ]
        },{
            version: "Version 1.1.0",
            detail: [
                "Now using a different audio class so you can listen to music or a podcast while working out. To control workout prompt volume, use System Sounds volume in the Sounds & Ringstone system preference.",
            ]
        },{
            version: "Version 1.0.0",
            detail: [
                "Initial general release, with a couple important workouts.",
            ]
        }
    ];

    // setup command menu
    this.cmdMenuModel = {
        visible: false,
        items: [
            {},
            {
                label: $L("OK! Let's Go..."),
                command: 'do-continue'
            },
            {}
        ]
    };
};

VersionAssistant.prototype.setup = function() {
    this.titleElement = this.controller.get('title');
    this.dataElement = this.controller.get('data');

    this.titleElement.innerHTML = $L('Version Info');

    var html = '';
    html += '<div style="margin: 2px 12px 12px 12px">' + this.startupMessage + '</div>';

    for (var i = 0; i < this.changelog.length; i++) {
        html += Mojo.View.render({ object: { title: this.changelog[i].version }, template: 'version/rowDivider' });
        html += '<ul>';

        for (var j = 0; j < this.changelog[i].detail.length; j++) {
            html += '<li>' + this.changelog[i].detail[j] + '</li>';
        }
        html += '</ul>';
    }

    // set data
    this.dataElement.innerHTML = html;

    // setup menu
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, { visible: false });

    //if (this.isStartup) {
    // set command menu
    this.controller.setupWidget(Mojo.Menu.commandMenu, { menuClass: 'no-fade' }, this.cmdMenuModel);
    //}
};

VersionAssistant.prototype.activate = function(event) {
    this.timer = this.controller.window.setTimeout(this.showContinue.bind(this), 2 * 1000);
};
VersionAssistant.prototype.deactivate = function(event) {};
VersionAssistant.prototype.cleanup = function(event) {};

VersionAssistant.prototype.showContinue = function() {
    // show the command menu
    this.controller.setMenuVisible(Mojo.Menu.commandMenu, true);
};

VersionAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-continue':
                this.controller.stageController.popScene();
                break;
        }
    }
};