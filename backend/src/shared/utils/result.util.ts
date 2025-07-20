export class Result<T, E = Error> {
  constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: E,
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  static failure<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  static fromPromise<T>(promise: Promise<T>): Promise<Result<T>> {
    return promise
      .then((value) => Result.success(value))
      .catch((error) => Result.failure(error));
  }
}