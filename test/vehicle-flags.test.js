var assert = require("assert");

var Flags = require("../public/js/vehicle-flags");

/*
 * Cases are pinned to the real production distribution (2,248,869 vehicles,
 * surveyed Aug 2026). The counts are in the test names so that anyone tempted
 * to collapse this back into a single toBool() can see how much data each
 * branch covers — and that the polarity genuinely differs per field.
 *
 * Mirrors police-cad-app/utils/__tests__/vehicleFlags.test.mjs.
 */
describe("vehicle-flags", function () {
  describe("registrationValid", function () {
    it('treats "1" as valid — the legacy select listed Yes first (2,068,404 docs)', function () {
      assert.equal(Flags.registrationValid({ validRegistration: "1" }), true);
    });
    it('treats "2" as invalid (57,567 docs)', function () {
      assert.equal(Flags.registrationValid({ validRegistration: "2" }), false);
    });
    it('treats "true"/"false" as themselves (120,976 / 1,922 docs)', function () {
      assert.equal(Flags.registrationValid({ validRegistration: "true" }), true);
      assert.equal(Flags.registrationValid({ validRegistration: "false" }), false);
    });
    it("is false for a missing field or a missing vehicle", function () {
      assert.equal(Flags.registrationValid({}), false);
      assert.equal(Flags.registrationValid(null), false);
      assert.equal(Flags.registrationValid(undefined), false);
    });
  });

  describe("insuranceValid", function () {
    it("follows the same polarity as registration", function () {
      assert.equal(Flags.insuranceValid({ validInsurance: "1" }), true); // 2,044,982
      assert.equal(Flags.insuranceValid({ validInsurance: "2" }), false); //   80,992
      assert.equal(Flags.insuranceValid({ validInsurance: "true" }), true); // 120,284
      assert.equal(Flags.insuranceValid({}), false);
    });
  });

  describe("stolen", function () {
    it('treats "2" as stolen — the legacy select listed No first (95,592 docs)', function () {
      assert.equal(Flags.stolen({ isStolen: "2" }), true);
    });
    it('treats "1" as NOT stolen (2,027,625 docs)', function () {
      assert.equal(Flags.stolen({ isStolen: "1" }), false);
    });
    it("is the opposite polarity to registration, which is the whole bug", function () {
      var v = { validRegistration: "1", isStolen: "1" };
      assert.equal(Flags.registrationValid(v), true);
      assert.equal(Flags.stolen(v), false);
    });
    it('treats "true"/"false"/"" as themselves (2,055 / 34,681 / 86,074 docs)', function () {
      assert.equal(Flags.stolen({ isStolen: "true" }), true);
      assert.equal(Flags.stolen({ isStolen: "false" }), false);
      assert.equal(Flags.stolen({ isStolen: "" }), false);
    });
    it("is false for a missing field or a missing vehicle", function () {
      assert.equal(Flags.stolen({}), false);
      assert.equal(Flags.stolen(null), false);
    });

    describe("department-dashboard records, which used the inverted polarity", function () {
      // That writer is the only source of a numeric isExempt, and it saved all
      // four flags together — so a numeric isExempt identifies the record.
      it('reads "1" as stolen there (111 docs)', function () {
        assert.equal(Flags.stolen({ isStolen: "1", isExempt: "2" }), true);
      });
      it('reads "2" as NOT stolen there (2,731 docs)', function () {
        assert.equal(Flags.stolen({ isStolen: "2", isExempt: "2" }), false);
      });
      it("still lets an explicit string win", function () {
        assert.equal(Flags.stolen({ isStolen: "true", isExempt: "1" }), true);
        assert.equal(Flags.stolen({ isStolen: "false", isExempt: "1" }), false);
      });
      it("does not trigger on a modern isExempt", function () {
        assert.equal(Flags.stolen({ isStolen: "2", isExempt: "false" }), true);
      });
    });
  });

  describe("exempt", function () {
    it('treats "1" as exempt — only the department dashboard wrote numerics (202 docs)', function () {
      assert.equal(Flags.exempt({ isExempt: "1" }), true);
      assert.equal(Flags.exempt({ isExempt: "2" }), false); // 2,926 docs
      assert.equal(Flags.exempt({ isExempt: "true" }), true); // 2,437 docs
      assert.equal(Flags.exempt({}), false); // 2,188,200 docs
    });
  });

  describe("toApi", function () {
    it("always writes the modern encoding", function () {
      assert.equal(Flags.toApi(true), "true");
      assert.equal(Flags.toApi(false), "false");
    });
  });

  describe("the vehicle from the original bug report", function () {
    // Plate 28TWQ102 / VIN BMDBY6CAVD7JMLUCA. All four values are exactly what
    // one department-dashboard save produces, so they read with that polarity.
    var reported = {
      validRegistration: "1",
      validInsurance: "1",
      isStolen: "2",
      isExempt: "2",
    };
    it("renders registration and insurance as valid", function () {
      assert.equal(Flags.registrationValid(reported), true);
      assert.equal(Flags.insuranceValid(reported), true);
    });
    it("renders it as not stolen and not exempt", function () {
      assert.equal(Flags.stolen(reported), false);
      assert.equal(Flags.exempt(reported), false);
    });
  });
});
