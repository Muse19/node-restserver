const jwt = require('jsonwebtoken');

let verificaToken = (req, res, next) => {
    let token = req.get('token')

    jwt.verify(token, process.env.SEED, (err, decode) => {
        if (err) {
            return res.status(401).json({
                ok: false,
                err: {
                    message: 'token inválido'
                }
            });
        }

        req.usuario = decode.usuario;
        next();
    });
};

let verificaRoles = roles => (req, res, next) => {
    if (roles.indexOf(req.usuario.role) > -1) {
        return next();
    }

    res.status(403).json({
        ok: false,
        err: {
            message: 'No tiene permisos para ejecutar esta acción'
        }
    })
};

module.exports = {
    verificaToken,
    verificaRoles
};