define(['N/record'],
  function(record) {

    function each(params) {

      var funcName = "mts_MU_customer_deposit_paymethod" + params.type + " " + params.id;

      var PAYMENT_METHOD_CASH = 11;

      try {

        var CDEP = record.load({type: params.type, id: params.id});
        CDEP.setValue("paymentmethod",PAYMENT_METHOD_CASH);

        var id = CDEP.save();

        log.audit(funcName, "Record Processed.  Customer Deposit updated: " + id);

      } catch (e) {
        log.error(funcName, e);
      }
    }

    return {
      each: each
    };
  }
);