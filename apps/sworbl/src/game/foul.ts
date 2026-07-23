// THE FOUL LIST — public-name gate (leaderboard names are the ONE place
// sworbl shows strangers your text). Deliberately truncated STEMS: the
// engine's containsFoulTerm requires a word boundary BEFORE the term only
// (the Scunthorpe rule — 'sex' does not flag ESSEX), so a stem catches its
// variants. Names are 2-10 chars A-Z0-9, so in practice the boundary is
// the start of the name. Server-side twin arrives with the rename edge
// function (launch chore); this client gate keeps honest builds clean.
export const FOUL_STEMS = [
  'fuck', 'shit', 'cunt', 'bitch', 'ass', 'dick', 'cock', 'twat', 'wank',
  'slut', 'whore', 'puss', 'penis', 'vagin', 'anal', 'anus', 'semen', 'cum',
  'jizz', 'tit', 'boob', 'porn', 'rape', 'nigg', 'fag', 'spic', 'kike',
  'chink', 'gook', 'tranny', 'retard', 'nazi', 'hitler', 'kkk', 'pedo',
];
