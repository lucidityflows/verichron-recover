#  Debt Import Lifecycle

  This lifecycle begins when a user uploads a portfolio of debts into the system.

   1. Event: debts.portfolio.import_started
       * Publisher: api-debts
       * Subscriber: None identified.
       * Purpose: This event acts as an initial marker to signify that api-debts has started processing a new portfolio file. It's likely used for internal state tracking
         or logging.

   2. Event: debts.portfolio.debtor_batch_ready
       * Publisher: api-debts
       * Subscriber: api-debtors
       * Purpose: After parsing the import file, api-debts groups the debtors found in the file into batches. It publishes this event to hand off a batch of raw debtor
         information to api-debtors to be formally provisioned in that service.

   3. (Internal Processing) api-debtors receives the batch. Its responsibility is to create DebtorProfile and DebtorIdentity records. It also needs to ensure a
      corresponding User account exists for each debtor. To do this, it communicates with api-users.

   4. Event: users.debtor_user.created_batch
       * Publisher: api-users
       * Subscriber: api-debtors
       * Purpose: This event serves as a confirmation. After api-debtors requests the creation of users for the debtor batch, api-users performs the creation (or linking
         to existing users by email) and publishes this event to notify api-debtors that the user accounts are ready.

   5. Event: debtors.identity.user_linked
       * Publisher: api-debtors
       * Subscriber: api-debts
       * Purpose: Once api-debtors has received confirmation of user creation and has successfully created its own DebtorProfile and linked it to a userId, it publishes
         this event. This informs api-debts that the debtor is fully provisioned and provides the necessary IDs to link the debt records to the debtor records.

   6. Event: debts.debt.created
       * Publisher: api-debts
       * Subscriber: api-communications
       * Purpose: After api-debts links its newly created debt records to the now-provisioned debtors, it fires this event. This signals that a new, fully contextualized
         debt exists in the system. api-communications listens to this to potentially trigger initial contact letters or emails.

   7. Event: debts.portfolio.import_completed
       * Publisher: api-debts
       * Subscriber: None identified.
       * Purpose: After api-debts has processed all batches from the file and has received debtors.identity.user_linked confirmations for all of them, it publishes this
         final event. This signals the end of the entire import process and could be used to notify the original user who uploaded the file.

  This sequence shows a clear, choreographed flow of data and responsibility between api-debts, api-debtors, api-users, and api-communications to reliably import and
  provision new data.
