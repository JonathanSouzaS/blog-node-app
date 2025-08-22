module.exports = {
    isAdmin: (req, res, next) => {
        if(req.isAuthenticated() && req.user.isAdmin == 1){
            return next()
        }

        req.flash('error_msg', 'Você não tem permissão para acessar essa página.')
        res.redirect('/')
    }
}