module.exports = {
    isAuthenticated: (req, res, next) => {
        if(req.isAuthenticated()){
            return next()
        }

        req.flash('error_msg', 'Você não tem permissão para acessar essa página.')
        res.redirect('/')
    }
}