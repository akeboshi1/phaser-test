import { rootInjector, Injector } from "./injector";
import { InjectOptions } from "./inject";

export function Injectable(injectOptions?: InjectOptions): (_constructor: any) => any {
  return function (_constructor: any): any {
    let injector: Injector = rootInjector;
    let provide: any = _constructor;
    if (injectOptions && injectOptions.injector) injector = injectOptions.injector;
    if (injectOptions && injectOptions.provide) provide = injectOptions.provide;
    injector.setProvider(provide, _constructor);
    return _constructor;
  };
}
