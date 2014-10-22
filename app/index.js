var yeoman = require('yeoman-generator'),
chalk = require('./chalk_themes'),
self

var crittercismGenerator = yeoman.generators.Base.extend({
	greet: function() {
		this.log(chalk.info('This component will allow you to configure Crittercism for an android application'))
	}
})

module.exports = crittercismGenerator