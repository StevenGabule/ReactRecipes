const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const createToken = (user, secret, expiresIn) => {
    const {username, email} = user;
    return jwt.sign({username, email}, secret, {expiresIn});
};

exports.resolvers = {
    Query: {
        getAllRecipes: async (root, args, {Recipe}) => {
            return Recipe.find().sort({createdDate: "desc"});
        },
        getRecipe: async (root, {_id}, {Recipe}) => {
            return Recipe.findOne({_id});
        },

        searchRecipes: async (root, {searchTerm}, {Recipe}) => {
            if (searchTerm) {
                return Recipe.find(
                    {
                        $text: {$search: searchTerm}
                    },
                    {
                        score: {$meta: "textScore"}
                    }
                ).sort({
                    score: {$meta: "textScore"}
                });
            } else {
                return Recipe.find().sort({
                    likes: "desc",
                    createdDate: "desc"
                });
            }
        },

        getUserRecipes: async (root, {username}, {Recipe}) => {
            return Recipe.find({username}).sort({
                createdDate: 'desc'
            });
        },

        getCurrentUser: async (root, args, {currentUser, User}) => {
            if (!currentUser) {
                return null;
            }
            return User.findOne({username: currentUser.username})
                .populate({
                    path: 'favorites',
                    model: 'Recipe'
                });
        }
    },
    Mutation: {
        addRecipe: async (root, {name, imageUrl, description, category, instructions, username}, {Recipe}) => {
            return await new Recipe({
                name,
                imageUrl,
                description,
                category,
                instructions,
                username
            }).save();
        },

        likeRecipe: async (root, {_id, username}, { Recipe, User}) => {
            const recipe = await Recipe.findOneAndUpdate({_id}, {$inc: {likes: 1}});
            const user = await User.findOneAndUpdate({username}, {$addToSet: { favorites: _id}});
            return recipe;
        },
        unLikeRecipe: async (root, {_id, username}, { Recipe, User}) => {
            const recipe = await Recipe.findOneAndUpdate({_id}, {$inc: {likes: -1}});
            const user = await User.findOneAndUpdate({username}, {$pull: { favorites: _id}});
            return recipe;
        },

        deleteUserRecipe: async (root, {_id}, {Recipe}) => {
            return Recipe.findOneAndRemove({_id});
        },

        updateUserRecipe: async (root, { _id, name, imageUrl, category, description}, {Recipe}) => {
            return Recipe.findOneAndUpdate(
                {_id},
                {$set: {name, imageUrl, category, description}},
                {new: true}
            );
        },

        signInUser: async (root, {username, password}, {User}) => {
            const user = await User.findOne({username});
            if (!user) {
                throw new Error('User not found');
            }
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }
            return {token: createToken(user, process.env.SECRET, '1hr')};
        },

        signUpUser: async (root, {username, email, password}, {User}) => {
            const user = await User.findOne({username});
            if (user) {
                throw new Error('User already exists');
            }
            const newUser = await new User({
                username,
                email,
                password
            }).save();
            return {token: createToken(newUser, process.env.SECRET, '1hr')};
        }
    }
};
