const keystone = require('keystone');
const async = require('async');

exports = module.exports = (req, res) => {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	// Init locals
	locals.section = 'blog';
	locals.filters = {
		category: req.params.category,
	};
	locals.data = {
		posts: [],
		categories: [],
	};

	// Carga todas los cursos
	view.on('init', (next) => {

		keystone.list('PostCategory').model.find().sort('name').exec( (err, results) => {

			if (err || !results.length) {
				return next(err);
			}

			locals.data.categories = results;

			// Load the counts for each category
			async.each(locals.data.categories, (category, next) => {

				keystone.list('Post').model.count().where('categories').in([category.id]).exec( (err, count) => {
					category.postCount = count;
					next(err);
				});

			}, (err) => {
				next(err);
			});
		});
	});

	// Load the current category filter
	view.on('init', function (next) {

		if (req.params.category) {
			keystone.list('PostCategory').model.findOne({ key: locals.filters.category }).exec(function (err, result) {
				locals.data.category = result;
				next(err);
			});
		} else {
			next();
		}
	});

	// Load the posts
	view.on('init', (next) => {

		var q = keystone.list('Post').paginate({
			page: req.query.page || 1,
			perPage: 6,
			maxPages: 10,
			filters: {
				state: 'published',
			},
		})
			.sort('-publishedDate')
			.populate('author categories');

		if (locals.data.category) {
			q.where('categories').in([locals.data.category]);
		}

		q.exec( (err, results) => {
			locals.data.posts = results;
			next(err);
		});
	});

	// Render the view
	view.render('blog');
};
