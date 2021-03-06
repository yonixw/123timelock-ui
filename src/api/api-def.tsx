import * as React from "react";

// ============= Types ==============

export type TimeToken = {
  // = "delayed key"
  name: string;
  proof: string;
  salt: string;
};

export type LockedData = {
  name: string;
  enc_data: string;
  enc_pass: string;
};

export type UnLockedData = {
  name: string; // name of unlocked data
  from: number;
  to: number;
  unlockproof: string;
  token: TimeToken;
};

export type Group = {
  name: string;
  salt: string;
  tokens: Array<TimeToken>;
  locked: Array<LockedData>;
  unlocked: Array<UnLockedData>;
};

// =============  API  ==============
const safeB64Pairs: [string, RegExp][][] = [
  // Including premaid regexes
  [
    ["+", /\+/g],
    ["-", /-/g]
  ],
  [
    ["/", /\//g],
    ["_", /_/g]
  ],
  [
    ["=", /=/g],
    [".", /\./g]
  ]
];

export function makeSafeB64_32(b64string: string) {
  let result = b64string || "";
  safeB64Pairs.forEach((p) => {
    result = result.replace(p[0][1], p[1][0]);
  });
  return result;
}
export function undoSafeB64_32(b64string: string) {
  let result = b64string || "";
  safeB64Pairs.forEach((p) => {
    result = result.replace(p[1][1], p[0][0]);
  });
  return result;
}

const SERVER_BASE =
  localStorage.getItem("SERVER_URL") ||
  "https://timelock-back-ga.my123.app/api";
const fastFetch = async (
  path: string,
  params: { [key: string]: string | string[] }
) => {
  let url = SERVER_BASE + path + "?rnd=" + Date.now() + "." + Math.random();
  let reqBody = "_ignore=0"; // so we can append others with '&'
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (!Array.isArray(v)) {
      reqBody += `&${k}=${encodeURIComponent(v)}`;
    } else {
      v.forEach((val) => {
        reqBody += `&${k}=${encodeURIComponent(val)}`;
      });
    }
  });
  const result = { err: null, data: null };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
      body: reqBody
    });
    const json = await response.json();
    result.data = json;
    if (result.data.err) {
      result.err = result.data.err;
    }
  } catch (error) {
    result.err = error;
  }
  return result;
};

export const fetchNewGroup = async (times: Array<string>) => {
  const result: {
    err?: string;
    data: {
      salt: string;
      tokens: Array<TimeToken>;
    };
  } = await fastFetch("/setup", { time: times });
  console.log("/setup", result);
  return result;
};

export const fetchEncPass = async (salts: string[], pass: string) => {
  const result: {
    err?: string;
    data: {
      enckey: string[];
    };
  } = await fastFetch("/enc", { salts, pass });
  console.log("/enc", result);
  return result;
};

export const fetchEncHash = async (hashparts: string[], pass: string) => {
  const result: {
    err?: string;
    data: {
      encparts: string[];
    };
  } = await fastFetch("/enchash", { hashparts, pass });
  console.log("/enchash", result);
  return result;
};

export const fetchStartUnlock = async (
  encPass: string,
  keySalt: string,
  keyId: string,
  keyProof: string,
  offsetMin = 0,
  durationMin = 15
) => {
  const result: {
    err?: string;
    data: {
      from: number;
      to: number;
      proof: string;
    };
  } = await fastFetch("/unlock/begin", {
    enckey: encPass,
    salt: keySalt,
    token: keyId,
    tokenproof: keyProof,
    offsetstartmin: offsetMin.toString(),
    duration: durationMin.toString()
  });
  console.log("/unlock/begin", result);
  return result;
};

export const fetchFinishUnlockSimple = async (
  encPass: string,
  from: number,
  to: number,
  salt: string,
  proof: string
) => {
  const result: {
    err?: string;
    data: {
      pass: string;
      timeLeftOpen: string;
    };
  } = await fastFetch("/unlock/finish", {
    enckey: encPass,
    from: from.toString(),
    to: to.toString(),
    proof,
    salt
  });
  console.log("/unlock/finish (simple)", {
    // redact pass
    err: result.err,
    data: result?.data?.timeLeftOpen
  });
  return result;
};

export const fetchFinishUnlockSha = async (
  encPass: string,
  from: number,
  to: number,
  salt: string,
  proof: string,
  hashtype: string,
  hashstate: string,
  hashsecret: string
) => {
  const result: {
    err?: string;
    data: {
      hashstep: string;
    };
  } = await fastFetch("/unlock/finish", {
    enckey: encPass,
    from: from.toString(),
    to: to.toString(),
    proof,
    salt,
    mode: "sha-step",
    hashtype,
    hashstate,
    hashsecret
  });
  console.log("/unlock/finish (sha-step)", {
    // redact pass
    err: result.err,
    data: result?.data?.hashstep
  });
  return result;
};

export const fetchFinishUnlockOTP = async (
  encPass: string,
  from: number,
  to: number,
  salt: string,
  proof: string,
  hashtype: string,
  hashsecret: string,
  hashextra: string
) => {
  const result: {
    err?: string;
    data: {
      hashstep: string;
    };
  } = await fastFetch("/unlock/finish", {
    enckey: encPass,
    from: from.toString(),
    to: to.toString(),
    proof,
    salt,
    mode: "otp-step",
    hashtype,
    hashsecret: makeSafeB64_32(hashsecret),
    hashextra
  });
  console.log("/unlock/finish (otp-step)", {
    // redact pass
    err: result.err,
    data: result?.data?.hashstep
  });
  return result;
};

export const fetchCreateTemp = async (
  token: string,
  tokenproof: string,
  salt: string
) => {
  const result: {
    err?: string;
    data: {
      from: number;
      tempproof: string;
    };
  } = await fastFetch("/temp/begin", {
    token,
    tokenproof,
    salt
  });
  console.log("/temp/begin", result);
  return result;
};

export const fetchConvertFastTemp = async (
  token: string,
  tempproof: string,
  from: number,
  salt: string
) => {
  const result: {
    err?: string;
    data: {
      mindiff: string;
      fastproof: string;
    };
  } = await fastFetch("/temp/fastcopy", {
    token,
    tempproof,
    from: from.toString(),
    salt
  });
  console.log("/temp/fastcopy", result);
  return result;
};

export const fetchUnloackWithFast = async (
  token: string,
  salt: string,
  mindiff: string,
  fastproof: string,
  enckey: string
) => {
  const result: {
    err?: string;
    data: {
      from: number;
      to: number;
      proof: string;
    };
  } = await fastFetch("/temp/unlock", {
    token,
    salt,
    mindiff,
    fastproof,
    enckey
  });
  console.log("/temp/unlock", result);
  return result;
};
