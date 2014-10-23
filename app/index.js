var yeoman = require('yeoman-generator'),
chalk = require('./chalk_themes'),
fs = require('fs'),
spawn = require('child_process').spawn,
self

var crittercismGenerator = yeoman.generators.Base.extend({
	greet: function() {
		this.log(chalk.info('This component will allow you to configure Crittercism for an android application'))
	},
	init: function() {
		self = this
		this.on('end', function (code) {
			this.log('\n')
			if(code != false) {
				this.log(chalk.success("Finished configuring Crittercism for your Android project"))
			} else {
				this.log(chalk.error("Failed to configure crittercism"))
				process.exit(1)
			}
		})
	},
	promptTask: function() {
		var prompts = [{
			type : 'list',
			name : 'project_type',
			message : 'What type of android project is this',
			choices : ['Gradle', 'Maven']
		}, {
			type : 'confirm',
			name : 'proguard',
			message : 'Generate Proguard? '
		}, {
			when : function(response) { return response.proguard },
			name : 'proguard_location',
			message : "Where is the proguard file?",
			default : './app/proguard-rules.pro',
			validate : function(input) {
				if(fs.existsSync(input)) {
					return true
				} else {
					return "Please enter a valid path"
				}
			}
		}, {
			type : 'confirm',
			name : 'ndk',
			message : 'Setup NDK agent? ',
			default : false
		}]
		var done = this.async()
		this.prompt(prompts, function (answers) {
			self.project_type = answers.project_type
			self.proguard = answers.proguard
			self.proguard_location = answers.proguard_location
			self.ndk = answers.ndk
			self.log('\n')
			done()
		})
	},
	confirmFileLocations: function() {
		if(this.project_type === 'Gradle') {
			this.build_location = "./app/build.gradle"
		} else {
			this.build_location = "./pom.xml"
		}
		this.manifest_location = "./app/src/main/AndroidManifest.xml"

		if(!fs.existsSync('app/')) {
			this.log(chalk.error("Could not find app folder.  Are you in the project root?"))
			this.emit('end', false)
		} else if(!fs.existsSync(this.manifest_location)) {
			this.log(chalk.error("Could not find AndroidManifest.xml at: ") + chalk.warning(this.manifest_location))
			this.log(chalk.error("Are you in the project root?"))
			this.emit('end', false)
		} else if(!fs.existsSync(this.build_location)) {
			this.log(chalk.error("Could not find the app build file at: ") + chalk.warning(this.build_location))
			this.log(chalk.error("Are you in the project room?"))
			this.emit('end', false)
		}
	},
	insertManifestPermissions: function() {

	}
})

module.exports = crittercismGenerator