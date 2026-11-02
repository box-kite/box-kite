type FormValue = string | string[] | number | number[] | boolean;
interface FormObject {
  [index: string]: FormValue | FormObject;
}

namespace FormUtils {
  export function getFormEntries(form: HTMLFormElement) {
    // Said in words rather than as a TypeError on `null.elements`, which names neither the form nor the ref behind it.
    if (!form) throw new Error('[box-kite] <Form> read its entries with no <form> element: its ref never reached the element.');

    const elementsGroupByName = Array.from(form.elements).reduce(
      (state, element) => {
        const name = (element as HTMLInputElement).name;
        if (!name) {
          return state;
        }

        if (!state[name]) {
          state[name] = [];
        }

        state[name].push(element as HTMLInputElement);

        return state;
      },
      {} as Record<string, HTMLInputElement[]>,
    );

    return Object.entries(elementsGroupByName).reduce((obj, [name, elements]) => {
      if (elements.length === 1) {
        const el = elements[0];

        setValue(obj, name, el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value);
      } else {
        const values = elements.reduce((values, el) => {
          if (el.type === 'checkbox' || el.type === 'radio') {
            if (el.checked) {
              values.push(el.value);
            }
          } else {
            values.push(el.value);
          }

          return values;
        }, [] as string[]);

        setValue(obj, name, values);
      }

      return obj;
    }, {} as FormObject);
  }

  function setValue(obj: FormObject, name: string, value: FormValue) {
    if (name.includes('.')) {
      const names = name.split('.');

      let objPosition = obj;

      names.forEach((n, index) => {
        if (names.length > index + 1) {
          const test = n.match(/^(.+)\[(\d)\]$/);

          if (test) {
            const [, arrName, arrIndex] = test;
            objPosition[arrName] = (objPosition[arrName] || []) as FormObject;
            (objPosition[arrName] as FormObject)[arrIndex] = (objPosition[arrName] as FormObject)[arrIndex] || {};
            objPosition = (objPosition[arrName] as FormObject)[arrIndex] as FormObject;
          } else {
            objPosition[n] = objPosition[n] || {};
            objPosition = objPosition[n] as FormObject;
          }
        } else {
          objPosition[n] = value;
        }
      });
    } else {
      obj[name] = value;
    }
  }
}

export default FormUtils;
