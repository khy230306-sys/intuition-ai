# PIP Simulation Report

- Shoes simulated: **100,000**
- Rounds simulated: **2,200,000**
- Elapsed: **9381 ms**
- Integrity errors: **0**

## PIP value distribution (playing cards only)

| Value | Count | Ratio |
| --- | ---: | ---: |
| 1 | 880236 | 20.005% |
| 2 | 880088 | 20.002% |
| 3 | 880071 | 20.002% |
| 4 | 879146 | 19.981% |
| 5 | 880459 | 20.010% |

## CARD DUEL distribution

| Result | Count | Ratio |
| --- | ---: | ---: |
| UP | 897866 | 40.812% |
| SAME | 404111 | 18.369% |
| DOWN | 898023 | 40.819% |

## TOTAL band distribution

| Band | Count | Ratio |
| --- | ---: | ---: |
| LOW | 881090 | 40.050% |
| CENTER | 438933 | 19.951% |
| HIGH | 879977 | 39.999% |

## Notes

- Hidden 6 cards are excluded from value distribution because they are never dealt during the 22 rounds.
- No mid-shoe reshuffle is performed.
- Integrity checks validate deck composition, hidden/playing split, cursor/history sync, and 22-round completion.
