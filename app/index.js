var string_utils = require('./string_utils')
var yeoman = require('yeoman-generator'),
chalk = require('./chalk_themes'),
fs = require('fs'),
spawn = require('child_process').spawn,
path = require('path'),
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
		var name;
		if(this.project_type === 'Gradle') {
			this.build_location = "./app/build.gradle"
			name = "app/build.gradle"
		} else {
			this.build_location = "./pom.xml"
			name = "pom.xml"
		}
		this.manifest_location = "./app/src/main/AndroidManifest.xml"
		fail = function(file_name, file_location) {
			self.log(chalk.error("Could not find ") + chalk.warning(file_name) + chalk.error(" at :")
				+ chalk.warning(file_location))
			self.log(chalk.error("Are you in the project root?"))
			self.emit('end', false)
		}

		if(!fs.existsSync('app/')) {
			this.log(chalk.error("Could not find app folder.  Are you in the project root?"))
			this.emit('end', false)
		} else if(!fs.existsSync(this.manifest_location)) {
			fail("AndroidManifest.xml", this.manifest_location)
		} else if(!fs.existsSync(this.build_location)) {
			fail(name, this.build_location)
		}
	},
	searchForMainActivity: function() {
		var done = this.async()
		var find_activity = spawn(path.join(__dirname, "find_main_activity.sh"), 
			[this.manifest_location])
		find_activity.stdout.on('data', function (data) {
			self.log(chalk.info("Found Main Activity: " + String(data)))
			self.main_activity = String(data)
		})
		find_activity.on('exit', function(code) {
			if(code === 1) {
				self.log(chalk.error("Failed to find an activity with ") 
					+ chalk.warning("android.intent.action.MAIN")
					+ chalk.error(" in the manifest"))
				self.emit('end', false)
			}
			done()
		})
	},
	insertManifestPermissions: function() {
		var manifest_file = this.readFileAsString(this.manifest_location)
		var manifest_begin = manifest_file.indexOf("<application")

		var permissions = self.read("_permissions.xml").trim().split('\n')
		permissions.forEach(function (entry) {
			if(!string_utils.contains(manifest_file, entry)) {
				manifest_file = string_utils.insert(manifest_file, entry+'\n', manifest_begin)
			}
		})
		this.conflicter.force = true
		this.log(chalk.success("Adding permissions in manifest..."))	
		this.write(this.manifest_location, manifest_file)
	},
	insertDependency: function() {
		var dependency_file = this.readFileAsString(this.build_location)
		if(this.project_type === 'Gradle') {
			var dependency_start = dependency_file.indexOf("{", 
				dependency_file.indexOf("dependencies"))+1
			var gradle = this.read("_crittercism.gradle").trim().split('\n')
			if(this.ndk) {
				var gradle_ndk = this.read("_crittercism_ndk.gradle").trim().split('\n')
				gradle_ndk.forEach(function (entry) {
					gradle.push(entry)
				})
			}

			gradle.forEach(function (entry) {
				if(!string_utils.contains(dependency_file, entry)) {
					dependency_file = string_utils.insert(dependency_file, '\n\t'+entry, dependency_start)
				}
			})
		} else {
			var dependency_start = dependency_file.indexOf(">",
				dependency_file.indexOf("dependencies"))+1
			var pom = this.read("_crittercism.pom")
			var pom_ndk = this.read("_crittercism_ndk.pom")
			if(!string_utils.contains(dependency_file, pom)) {
				dependency_file = string_utils.insert(dependency_file, '\n'+pom, dependency_start)
			}
			if(this.ndk && !string_utils.contains(dependency_file, pom_ndk)) {
				dependency_file = string_utils.insert(dependency_file, '\n'+pom_ndk, dependency_start)
			}
		}
		this.log(chalk.success("Adding dependencies in " + this.build_location + "..."))	
		this.write(this.build_location, dependency_file)
	}, 
	initializeCrittercism: function() {
		this.log(chalk.success("Initializing Crittercism in MainActivity: ") + chalk.warning(this.main_activity))
		var activity_file_location = "./app/src/main/java/" + this.main_activity.replace(/\./g, "\/").trim().concat(".java")
		var strings_file_location = "./app/src/main/res/values/strings.xml"

		var string_code_block = this.read("_strings.xml").split('\n')[2]
		var activity_code_block = this.read("_main_activity.java").split('\n')

		if(!fs.existsSync(activity_file_location)) {
			this.log(chalk.error("Could not find file: ") + chalk.warning(activity_file_location))
			this.emit('end', false)
		} else {
			var activity_content = this.dest.read(activity_file_location).split('\n')
			var hasImportStatement = string_utils.contains(activity_content.toString(), activity_code_block[0])
			var hasInitStatement = string_utils.contains(activity_content.toString(), activity_code_block[1])

			//Adding the import statement
			if(!hasImportStatement) {
				for (var i = 0; i < activity_content.length; i++) {
					if(string_utils.contains(activity_content[i], "package")) {
						activity_content.splice(i+1, 0, activity_code_block[0])
						break;
					}
				}
			}

			//Adding the initialization statement
			if(!hasInitStatement) {
				for (var i = 0; i < activity_content.length; i++) {
					if(string_utils.contains(activity_content[i], "super.onCreate(")) {
						activity_content.splice(i+1, 0, "\t\t"+activity_code_block[1])
						break;
					}
				}
			}

			//Commiting changes to the activity file
			var output = ""
			if(!(hasImportStatement && hasInitStatement)) {
				activity_content.forEach(function (entry) {
					output = output.concat(entry+'\n')
				})
				this.write(activity_file_location, output)
			} else {
				this.log(chalk.cyan("identical ") + activity_file_location)
			}

			//Adding strings resource
			if(!fs.existsSync(strings_file_location)) {
				this.copy(_strings.xml, strings_file_location)
			} else {
				var strings_content  = this.dest.read(strings_file_location).split('\n')
				var hasStringsResource = string_utils.contains(strings_content.toString(), string_code_block)
				if(!hasStringsResource) {
					for(var i = 0; i < strings_content.length; i++) {
						if(string_utils.contains(strings_content[i], "<resources>")) {
							strings_content.splice(i+1, 0, string_code_block)
							break;
						}
					}
					output = ""
					strings_content.forEach(function (entry) {
						output = output.concat(entry+'\n')
					})
					this.write(strings_file_location, output)
				} else {
					this.log(chalk.cyan("identical ") + strings_file_location)
				}
			}
		}
	}
})

module.exports = crittercismGenerator