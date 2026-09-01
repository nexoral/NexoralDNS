const executeFunction = (Function: () => void | Promise<void>): (() => Promise<void>) => {
  return async () => {
    try {
      await Function();
    } catch (error) {
      console.error("Error occurred during function execution:", error);
    }
  };
};

export const Ms = async (Function: () => void | Promise<void>, ms: number, firstEffect?: boolean): Promise<() => void> => {
  const exec = executeFunction(Function);
  if (firstEffect === true) {
    await exec();
  }
  const intervalId = setInterval(exec, ms);
  return () => clearInterval(intervalId);
};

export const Seconds = async (Function: () => void | Promise<void>, seconds: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, seconds * 1000, firstEffect);
};

export const Minutes = async (Function: () => void | Promise<void>, minutes: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, minutes * 60 * 1000, firstEffect);
};

export const Hours = async (Function: () => void | Promise<void>, hours: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, hours * 60 * 60 * 1000, firstEffect);
};

export const Days = async (Function: () => void | Promise<void>, days: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, days * 24 * 60 * 60 * 1000, firstEffect);
};

export const Weeks = async (Function: () => void | Promise<void>, weeks: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, weeks * 7 * 24 * 60 * 60 * 1000, firstEffect);
};

export const Months = async (Function: () => void | Promise<void>, months: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, months * 30 * 24 * 60 * 60 * 1000, firstEffect);
};

export const Years = async (Function: () => void | Promise<void>, years: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, years * 365 * 24 * 60 * 60 * 1000, firstEffect);
};

export const Decades = async (Function: () => void | Promise<void>, decades: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, decades * 10 * 365 * 24 * 60 * 60 * 1000, firstEffect);
};

export const Centuries = async (Function: () => void | Promise<void>, centuries: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, centuries * 100 * 365 * 24 * 60 * 60 * 1000, firstEffect);
};

export const Millenia = async (Function: () => void | Promise<void>, millenia: number, firstEffect?: boolean): Promise<() => void> => {
  return Ms(Function, millenia * 1000 * 365 * 24 * 60 * 60 * 1000, firstEffect);
};

export const Retry = Object.freeze({
  MS: Ms,
  Seconds,
  Minutes,
  Hours,
  Days,
  Weeks,
  Months,
  Centuries,
  Decades,
  Millenia,
  Year: Years,
});