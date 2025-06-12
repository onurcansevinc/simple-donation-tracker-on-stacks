;; Simple Donation Tracker Smart Contract
;; This contract allows users to make STX donations and track them transparently

(define-constant CONTRACT_OWNER tx-sender)

;; Define donation structure
(define-data-var total-donations uint u0)
(define-map donations uint {amount: uint, sender: principal, timestamp: uint})

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u1001))
(define-constant ERR_INVALID_AMOUNT (err u1002))
(define-constant ERR_DONATION_NOT_FOUND (err u1003))

;; Public functions

;; Make a donation
(define-public (make-donation (amount uint))
    (begin
        ;; Validate amount
        (asserts! (> amount u0) ERR_INVALID_AMOUNT)
        
        ;; Transfer STX from sender to contract
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        
        ;; Get current donation count
        (let ((donation-id (var-get total-donations)))
            ;; Store donation details
            (map-set donations donation-id {
                amount: amount,
                sender: tx-sender,
                timestamp: block-height
            })
            ;; Increment total donations
            (var-set total-donations (+ donation-id u1))
            (ok donation-id)
        )
    )
)

;; Get donation details by ID
(define-read-only (get-donation (donation-id uint))
    (let ((donation (map-get? donations donation-id)))
        (asserts! (is-some donation) ERR_DONATION_NOT_FOUND)
        (ok (unwrap! donation ERR_DONATION_NOT_FOUND))
    )
)

;; Get total number of donations
(define-read-only (get-total-donations)
    (ok (var-get total-donations))
)

;; Get all donations (returns a list of donation IDs)
(define-read-only (get-all-donations)
    (ok (map-keys donations))
)

;; Get total amount of donations
(define-read-only (get-total-amount)
    (ok (fold (map-values donations) u0 (lambda (acc donation) (+ acc (get amount donation)))))
) 