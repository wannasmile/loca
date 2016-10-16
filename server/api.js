'use strict';

var config = require('../config'),
    logger = require('winston'),
    moment = require('moment'),
    rs = require('./requeststrategy'),
    Helper = require('./managers/helper'),
    loginManager = require('./managers/loginmanager'),
    rentManager = require('./managers/rentmanager'),
    occupantManager = require('./managers/occupantmanager'),
    documentManager = require('./managers/documentmanager'),
    propertyManager = require('./managers/propertymanager'),
    ownerManager = require('./managers/ownermanager'),
    notificationManager = require('./managers/notificationmanager');

function API(router) {
    if (config.subscription) {
        router.route('/signup').post(loginManager.signup);
    }
    if (!config.demomode) {
        router.route('/login').post(loginManager.login);
    }
    router.route('/logout').get(rs.restrictedAreaAndRedirect, loginManager.logout);

    router.route('/api/selectrealm').post(rs.restrictedArea, loginManager.selectRealm);
    router.route('/occupants/one').post(rs.restrictedArea, occupantManager.one);
    router.route('/occupants/add').post(rs.restrictedArea, occupantManager.add);
    router.route('/occupants/update').post(rs.restrictedArea, occupantManager.update);
    router.route('/occupants/remove').post(rs.restrictedArea, occupantManager.remove);
    router.route('/api/occupants').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm,
            occupantIdx;
        occupantManager.findAllOccupants(realm, function(errors, occupants) {
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {
                for (occupantIdx = 0; occupantIdx < occupants.length; ++occupantIdx) {
                    delete occupants[occupantIdx].rents;
                }
                res.json(occupants);
            }
        });
    });
    router.route('/api/occupants/overview').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm;
        var countAll = 0,
            countActive = 0,
            countInactive = 0,
            index,
            occupant;

        occupantManager.findAllOccupants(realm, function(errors, occupants) {
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {

                if (occupants) {
                    countAll = occupants.length;
                    for (index = 0; index < occupants.length; index++) {
                        occupant = occupants[index];

                        if (!occupant.terminationDate) {
                            countActive++;
                        } else {
                            countInactive++;
                        }
                    }
                }
                res.json({
                    countAll: countAll,
                    countActive: countActive,
                    countInactive: countInactive
                });
            }
        });
    });

    router.route('/documents/update').post(rs.restrictedArea, documentManager.update);

    router.route('/api/notifications').get(rs.restrictedArea, notificationManager.findAll);

    router.route('/rents/one').post(rs.restrictedArea, rentManager.one);
    router.route('/rents/update').post(rs.restrictedArea, rentManager.update);
    router.route('/api/rents/occupant').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm,
            id = req.query.id,
            date = Helper.currentDate(req.query.month, req.query.year);

        rentManager.findOccupantRents(realm, id, date.month, date.year, function(errors, occupant, rent, rents) {
            var i, currentRent;
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {
                for (i = 0; i < rents.length; ++i) {
                    currentRent = rents[i];
                    currentRent.uid = currentRent.occupant._id + '|' + currentRent.month + '|' + currentRent.year;
                    if (Number(currentRent.year) === date.year && Number(currentRent.month) === date.month) {
                        currentRent.active = 'active';
                    }
                }
                res.json({
                    occupant: occupant,
                    rents: rents
                });
            }
        });
    });
    router.route('/api/rents').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm,
            date = Helper.currentDate(req.query.month, req.query.year);

        rentManager.findAllOccupantRents(realm, date.month, date.year, function(errors, rents) {
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {
                res.json(rents);
            }
        });
    });
    router.route('/api/rents/overview').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm,
            date = Helper.currentDate(req.query.month, req.query.year);

        rentManager.findAllOccupantRents(realm, date.month, date.year, function(errors, rents) {
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {
                var countPaid = 0,
                    countPartiallyPaid = 0,
                    countNotPaid = 0,
                    totalToPay = 0,
                    totalPaid = 0,
                    totalNotPaid = 0,
                    index,
                    currentRent;
                if (rents) {
                    for (index = 0; index < rents.length; index++) {
                        currentRent = rents[index];

                        if (currentRent.totalAmount <= 0 || currentRent.newBalance >= 0) {
                            countPaid++;
                        } else if (currentRent.payment > 0) {
                            countPartiallyPaid++;
                        } else {
                            countNotPaid++;
                        }
                        totalToPay += currentRent.totalToPay;
                        totalNotPaid += currentRent.newBalance;
                        totalPaid += currentRent.payment;
                    }
                    totalNotPaid = (-1 * totalNotPaid);
                }
                res.json({
                    countAll: countPaid + countPartiallyPaid + countNotPaid,
                    countPaid: countPaid,
                    countPartiallyPaid: countPartiallyPaid,
                    countNotPaid: countNotPaid,
                    totalToPay: totalToPay,
                    totalPaid: totalPaid,
                    totalNotPaid: totalNotPaid
                });
            }
        });
    });

    router.route('/properties/add').post(rs.restrictedArea, propertyManager.add);

    router.route('/properties/update').post(rs.restrictedArea, propertyManager.update);

    router.route('/properties/remove').post(rs.restrictedArea, propertyManager.remove);

    router.route('/api/properties').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm;
        propertyManager.findAllResources(realm, function(errors, properties) {
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {
                res.json(properties);
            }
        });
    });
    router.route('/api/properties/overview').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm,
            index,
            property,
            countAll = 0,
            countFree = 0,
            countBusy = 0;

        propertyManager.findAllResources(realm, function(errors, properties) {
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {
                for (index = 0; index < properties.length; ++index) {
                    property = properties[index];
                    if (property.available) {
                        countFree++;
                    } else {
                        countBusy++;
                    }
                    countAll++;
                }
                res.json({
                    countAll: countAll,
                    countFree: countFree,
                    countBusy: countBusy
                });
            }
        });
    });

    router.route('/api/accounting').get(rs.restrictedArea, function(req, res) {
        var year = req.query.year;
        var beginInterval = moment('01/01/'+year, 'DD/MM/YYYY'),
            endInterval = moment('31/12/'+year, 'DD/MM/YYYY');

        occupantManager.findAllOccupants(req.session.user.realm, function(errors, occupants) {
            var occupantsOfYear = occupants.filter(function(occupant) {
                var beginMoment = moment(occupant.beginDate, 'DD/MM/YYYY'),
                    endMoment = moment(occupant.terminationDate?occupant.terminationDate:occupant.endDate, 'DD/MM/YYYY');
                return beginInterval.isBetween(beginMoment, endMoment, '[]') || endInterval.isBetween(beginMoment, endMoment, '[]')
                    || ( beginMoment.isBetween(beginInterval, endInterval, '[]') && endMoment.isBetween(beginInterval, endInterval, '[]') );
            }) || [];
            res.json({
                payments: {
                    occupants: occupantsOfYear.map(function(occupant) {
                        return {
                            name: occupant.name,
                            beginDate: occupant.beginDate,
                            endDate: occupant.terminationDate?occupant.terminationDate:occupant.endDate,
                            rents: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(function(month) {
                                return occupant.rents[year][month] || {inactive: true};
                            })

                        };
                    })
                },
                entriesExists: {
                    entries: {
                        occupants: occupantsOfYear.filter(function(occupant) {
                            var beginMoment = moment(occupant.beginDate, 'DD/MM/YYYY');
                            return beginMoment.isBetween(beginInterval, endInterval, '[]');
                        }).map(function(occupant) {
                            return {
                                name: occupant.name,
                                beginDate: occupant.beginDate,
                                deposit: occupant.guaranty
                            };
                        })
                    },
                    exits: {
                        occupants: occupantsOfYear.filter(function(occupant) {
                            var endMoment = moment(occupant.terminationDate?occupant.terminationDate:occupant.endDate, 'DD/MM/YYYY');
                            return endMoment.isBetween(beginInterval, endInterval, '[]');
                        }).map(function(occupant) {
                            var balance = Object.keys(occupant.rents[year]).reduce(function(prev, cur) {
                                var b = occupant.rents[year][cur].balance;
                                return b!==0?b*-1:b;
                            });

                            return {
                                name: occupant.name,
                                leaseBroken: occupant.terminationDate && occupant.terminationDate!==occupant.endDate,
                                endDate: occupant.terminationDate?occupant.terminationDate:occupant.endDate,
                                deposit: occupant.guaranty,
                                depositRefund: occupant.guarantyPayback,
                                balance: balance,
                                toPay: Number(occupant.guarantyPayback?0:occupant.guaranty) + Number(balance)
                            };
                        })
                    }
                }
            });
        });
    });

    router.route('/api/owner').get(rs.restrictedArea, function(req, res) {
        var realm = req.session.user.realm;
        logger.silly('owner sent', realm);
        ownerManager.findOwner(realm, function(errors, realm) {
            if (errors && errors.length > 0) {
                res.json({
                    errors: errors
                });
            } else {
                res.json(realm);
            }
        });
    });
    router.route('/owner/update').post(rs.restrictedArea, ownerManager.update);
}

module.exports = API;
