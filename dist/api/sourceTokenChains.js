"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isSourceTokenChain(sourceToken) {
    return /^[a-zA-Z0-9_-]+(\|[a-zA-Z0-9_-]+)+$/.test(sourceToken);
}
exports.isSourceTokenChain = isSourceTokenChain;
const sourceTokenChainStates = {};
function getEffectiveSourceTokenFromChain(sourceToken) {
    let state = sourceTokenChainStates[sourceToken];
    if (!state) {
        state = sourceTokenChainStates[sourceToken] = {
            sourceTokens: sourceToken.split(/\|/),
            nextSourceTokenIx: 0
        };
    }
    if (state.nextSourceTokenIx >= state.sourceTokens.length) {
        throw new Error(`Source token chain '${sourceToken}' can only be used ${state.sourceTokens.length} times.`);
    }
    return state.sourceTokens[state.nextSourceTokenIx++];
}
exports.getEffectiveSourceTokenFromChain = getEffectiveSourceTokenFromChain;
//# sourceMappingURL=sourceTokenChains.js.map