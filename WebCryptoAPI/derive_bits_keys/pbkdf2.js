
function run_test() {
    var subtle = self.crypto.subtle;
    var testData = getTestData();
    var passwords = testData.passwords;
    var salts = testData.salts;
    var derivations = testData.derivations;

    setUpBaseKeys(passwords)
    .then(function(allKeys) {
        var baseKeys = allKeys.baseKeys;
        var noUsageKeys = allKeys.noUsageKeys;
        var wrongKey = allKeys.wrongKey;

        Object.keys(derivations).forEach(function(passwordSize) {
            Object.keys(derivations[passwordSize]).forEach(function(saltSize) {
                Object.keys(derivations[passwordSize][saltSize]).forEach(function(hashName) {
                    Object.keys(derivations[passwordSize][saltSize][hashName]).forEach(function(iterations) {
                        var testName = passwordSize + " password, " + saltSize + " salt, " + hashName + ", with " + iterations + " iterations";
                        promise_test(function(test) {
                            return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: hashName, iterations: parseInt(iterations)}, baseKeys[passwordSize], 256)
                            .then(function(derivation) {
                                assert_true(equalBuffers(derivation, derivations[passwordSize][saltSize][hashName][iterations]), "Derived correct key");
                            }, function(err) {
                                assert_unreached("deriveBits failed with error " + err.name + ": " + err.message);
                            });
                        }, testName);

                        // length null (OperationError)
                        promise_test(function(test) {
                            return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: hashName, iterations: parseInt(iterations)}, baseKeys[passwordSize], null)
                            .then(function(derivation) {
                                assert_unreached("null length should have thrown an OperationError");
                            }, function(err) {
                                assert_equals(err.name, "OperationError", "deriveBits with null length correctly threw OperationError: " + err.message);
                            });
                        }, testName + " with null length");

                        // 0 length (OperationError)
                        promise_test(function(test) {
                            return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: hashName, iterations: parseInt(iterations)}, baseKeys[passwordSize], 0)
                            .then(function(derivation) {
                                assert_unreached("0 length should have thrown an OperationError");
                            }, function(err) {
                                assert_equals(err.name, "OperationError", "deriveBits with 0 length correctly threw OperationError: " + err.message);
                            });
                        }, testName + " with 0 length");

                        // length not multiple of 8 (OperationError)
                        promise_test(function(test) {
                            return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: hashName, iterations: parseInt(iterations)}, baseKeys[passwordSize], 44)
                            .then(function(derivation) {
                                assert_unreached("non-multiple of 8 length should have thrown an OperationError");
                            }, function(err) {
                                assert_equals(err.name, "OperationError", "deriveBits with non-multiple of 8 length correctly threw OperationError: " + err.message);
                            });
                        }, testName + " with non-multiple of 8 length");

                        // - illegal name for hash algorithm (NotSupportedError)
                        var badHash = hashName.substring(0, 3) + hashName.substring(4);
                        promise_test(function(test) {
                            return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: badHash, iterations: parseInt(iterations)}, baseKeys[passwordSize], 256)
                            .then(function(derivation) {
                                assert_unreached("bad hash name should have thrown an NotSupportedError");
                            }, function(err) {
                                assert_equals(err.name, "NotSupportedError", "deriveBits with bad hash name correctly threw NotSupportedError: " + err.message);
                            });
                        }, testName + " with bad hash name " + badHash);

                        // - baseKey usages missing "deriveBits" (InvalidAccessError)
                        promise_test(function(test) {
                            return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: hashName, iterations: parseInt(iterations)}, noUsageKeys[passwordSize], 256)
                            .then(function(derivation) {
                                assert_unreached("missing deriveBits usage should have thrown an InvalidAccessError");
                            }, function(err) {
                                assert_equals(err.name, "InvalidAccessError", "deriveBits with missing deriveBits usage correctly threw InvalidAccessError: " + err.message);
                            });
                        }, testName + " with missing deriveBits usage");

                        // - baseKey algorithm does not match PBKDF2 (InvalidAccessError)
                        promise_test(function(test) {
                            return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: hashName, iterations: parseInt(iterations)}, wrongKey, 256)
                            .then(function(derivation) {
                                assert_unreached("wrong (ECDH) key should have thrown an InvalidAccessError");
                            }, function(err) {
                                assert_equals(err.name, "InvalidAccessError", "deriveBits with wrong (ECDH) key correctly threw InvalidAccessError: " + err.message);
                            });
                        }, testName + " with wrong (ECDH) key");
                    });

                    // Check that 0 iterations throws proper error
                    promise_test(function(test) {
                        return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: hashName, iterations: 0}, baseKeys[passwordSize], 256)
                        .then(function(derivation) {
                            assert_unreached("0 iterations should have thrown an error");
                        }, function(err) {
                            assert_equals(err.name, "OperationError", "deriveBits with 0 iterations correctly threw OperationError: " + err.message);
                        });
                    }, passwordSize + " password, " + saltSize + " salt, " + hashName + ", with 0 iterations");

                });

                // - legal algorithm name but not digest one (e.g., PBKDF2) (NotSupportedError)
                var nonDigestHash = "PBKDF2";
                [1, 1000, 100000].forEach(function(iterations) {
                    var testName = passwordSize + " password, " + saltSize + " salt, " + nonDigestHash + ", with " + iterations + " iterations";

                    promise_test(function(test) {
                        return subtle.deriveBits({name: "PBKDF2", salt: salts[saltSize], hash: nonDigestHash, iterations: parseInt(iterations)}, baseKeys[passwordSize], 256)
                        .then(function(derivation) {
                            assert_unreached("non-digest algorithm should have thrown an NotSupportedError");
                        }, function(err) {
                            assert_equals(err.name, "NotSupportedError", "deriveBits with non-digest algorithm correctly threw NotSupportedError: " + err.message);
                        });
                    }, testName + " with non-digest algorithm " + nonDigestHash);
                });

            });
        });
    }, function(err) {
        promise_test(function(test) {
            assert_unreached("setUpBaseKeys failed with error '" + err.message + "'");
        }, "setUpBaseKeys");
    });

    function setUpBaseKeys(passwords) {
        var promises = [];
        var baseKeys = {};
        var noUsageKeys = {};

        Object.keys(passwords).forEach(function(passwordSize) {
            var promise = subtle.importKey("raw", passwords[passwordSize], {name: "PBKDF2"}, false, ["deriveKey", "deriveBits"])
            .then(function(baseKey) {
                baseKeys[passwordSize] = baseKey;
            }, function(err) {
                promise_test(function(test) {
                    assert_unreached("setUpBaseKeys for key '" + passwordSize + "' failed with error '" + err.message + "'");
                }, "setUpBaseKeys for key '" + passwordSize + "'");
            });
            promises.push(promise);

            var promise = subtle.importKey("raw", passwords[passwordSize], {name: "PBKDF2"}, false, ["deriveBits"])
            .then(function(baseKey) {
                noUsageKeys[passwordSize] = baseKey;
            }, function(err) {
             promise_test(function(test) {
                 assert_unreached("setUpBaseKeys for key '" + passwordSize + "' with missing usage failed with error '" + err.message + "'");
             }, "setUpBaseKeys for key '" + passwordSize + "' with missing usage");
            });
            promises.push(promise);
        });

        var promise = subtle.generateKey({name: "ECDH", namedCurve: "P-256"}, false, ["deriveKey", "deriveBits"])
        .then(function(baseKey) {
            wrongKey = baseKey.privateKey;
        }, function(err) {
            promise_test(function(test) {
                assert_unreached("setUpBaseKeys for wrong key failed with error '" + err.message + "'");
            }, "setUpBaseKeys for wrong key");
        });
        promises.push(promise);


        return Promise.all(promises).then(function() {
            return {baseKeys: baseKeys, noUsageKeys: noUsageKeys, wrongKey: wrongKey};
        });
    }

    function equalBuffers(a, b) {
        if (a.byteLength !== b.byteLength) {
            return false;
        }

        var aBytes = new Uint8Array(a);
        var bBytes = new Uint8Array(b);

        for (var i=0; i<a.byteLength; i++) {
            if (aBytes[i] !== bBytes[i]) {
                return false;
            }
        }

        return true;
    }

}
