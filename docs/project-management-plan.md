# Project management phase: idea on record (2026-11-23, nothing built)

Owner's idea, to be worked out together later ("we can nail down the process together later").

## Why
Distrust between Ghanaian clients and carpenters makes jobs difficult. A project page run through the site protects both sides: the carpenter is not cut out mid-job, and the client has a record of what was agreed and paid.

## The flow as the owner described it (draft)
1. A client contacts a carpenter (the existing Hire a Carpenter page, jobs board or directory).
2. The carpenter accepts.
3. The carpenter prepares the job with the member tools: Job Pricing, the design (Smart Generator / 3D) and the cut lists.
4. What the client sees is **masked to the carpenter's preference**, so a client cannot take the full design and cut lists to another carpenter mid-job (for example: the client sees the 3D and the price, not the cut sheets).
5. The client approves.
6. The client pays **through the site**, so the site holds a reference, evidence that payment was made.
7. The payment record can be kept **private to the carpenter**, who can give admin access to it if there is ever a legal dispute.
8. The carpenter starts the job … (later stages to be agreed: progress, sign-off, final payment, the warranty).

## Where it sits in the order of work
**Parked behind a stage gate** (`MVP_GATES.md`, parking lot): Gate 2 (MVP validated) at the earliest, because it brings clients in as users and touches client money and disputes. Do not build before then.

When its gate opens, it comes after **My files** (profile page done 2026-11-23; My files is step 2, moving files is step 3), because a project is built from the pieces that work makes possible:
- saved files in folders by client and job (the job folder becomes the project)
- the shared `clients` registry (Job Pricing and Cut Sheet already use it)
- Job Pricing quotes (the price the client approves)
- the Smart Generator's client 3D file (what the client sees)
- Paystack payments, already live for memberships (the payment reference)
- the jobs board and Hire a Carpenter (how a client finds the carpenter)

## Questions to settle with the owner before building
- Who holds the client's money, if anyone? Recording a payment made directly to the carpenter is very different from the site taking money for the carpenter (Paystack split payments, refunds, the law on holding client funds). The idea as stated is "evidence of payment".
- What exactly can a client see at each stage, and who picks (the carpenter per job, or a member default)?
- Does the client get an account (phone + PIN, as members have) or a private link?
- Deposit and balance (Neewoody's own terms are 70 / 30): one payment or stages?
- What happens on a dispute: who can see what, and how does admin access get granted and logged?
- Is it for members only, and is it part of the membership or paid per project?
