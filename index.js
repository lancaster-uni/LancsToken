var request = require('request');
var randomstring = require('randomstring');

class CoSign {
    /**
     * 
     * @param {Object} config Holds the user info
     * @param {String} config.user Username
     * @param {String} config.pass Password
     */
    constructor(config) {
        this.config = config;
        this.tokenGenerated = false;
    }

    /**
     * Generates a User Token
     * @returns {Promise} Token in a String
     */
    getUserToken() {
        return new Promise((resolve, reject) => {
            _cosignCookie().then(d => {
                _cosignLogin(this.config, d).then(c => {
                    _getJWT('https://portal.lancaster.ac.uk/portal/api/profile', c).then(p => {
                        this.tokenGenerated = true;
                        this.config.token = p[0];
                        this.config.cookie = c[1];
                        resolve(p[0]);
                    }).catch(e => {
                        reject(e);
                    })
                }).catch(e => {
                    reject(e);
                })
            }).catch(e => {
                reject(e);
            })
        })
    }

    /**
     * The token of the user
     * Must have run getUserToken() Beforehand
     */
    get token() {
        return (this.tokenGenerated) ? this.config.token : new Error("Token not Generated... Please use getUserToken()");
    }
    
    /**
     * The CoSign cookie for the user
     * Must have run getUserToken() Beforehand
     */
    get cookie() {
        return (this.tokenGenerated) ? this.config.cookie : new Error("Cookie not Generated... Please use getUserToken()");
    }

}



function _cosignCookie() {
    return new Promise((resolve, reject) => {
        var uri = "https://weblogin.lancs.ac.uk/login/?cosign-https-portal.lancaster.ac.uk&https://portal.lancaster.ac.uk/student_portal";
        request(uri, (err, resp, body) => {
            if (err) reject(err);
            resolve(resp.headers['set-cookie']);
        });
    })
}

function _cosignLogin(config, cookie) {
    return new Promise((resolve, reject) => {
        var user = config.user;
        var pass = config.pass;

        var loginUrl = "https://weblogin.lancs.ac.uk/login/";
        var opts = {
            method: 'POST',
            url: loginUrl,
            headers: {
                'Cookie': cookie
            },
            form: {
                required: '',
                ref: 'https://myaccount.lancs.ac.uk',
                service: 'cosign-https-myaccount.lancs.ac.uk',
                state: 'login',
                login: user,
                password: pass,
                otp: '',
                doLogin: 'Login'
            },
        }
        request(opts, (err, resp, body) => {
            if (err) reject(err);
            resolve(resp.headers['set-cookie']);
        })

    })
}

function _getJWT(t, cookie) {
    return new Promise((resolve, reject) => {
        var url = `https://cisweb.lancaster.ac.uk/jwt-proxy-auth?issuer=DSP&return_to=`;

        const e = randomstring.generate({
            length: 50,
            charset: 'alphabetic'
        });
        const n = `${url}${t}&state=${e}`;

        request(n, { followRedirect: false, headers: { 'Cookie': cookie } }, (err, resp, body) => {
            if (err) reject(err);
            request(resp.headers['location'], { followRedirect: false, headers: { 'Cookie': cookie } }, (err, resp, body) => {
                if (err) reject(err);
                request("https://weblogin.lancs.ac.uk" + resp.headers['location'], { followRedirect: false, headers: { 'Cookie': cookie } }, (err, resp, body) => {
                    if (err) reject(err);
                    var sc = resp.headers['set-cookie'];
                    request(resp.headers['location'], { followRedirect: false, headers: { 'Cookie': sc } }, (err, resp, body) => {
                        if (err) reject(err);
                        var sc = resp.headers['set-cookie'].toString().replace('\u0000', '');
                        request(n, { followRedirect: false, headers: { 'Cookie': sc } }, (err, resp, body) => {
                            if (err) reject(err);
                            console.log(sc);
                            var u = new URL(resp.headers['location'].toString());
                            var c = u.searchParams.get("jwt");
                            resolve([c, sc]);
                        })
                    })
                })
            })
        })
    })

}

module.exports = CoSign;