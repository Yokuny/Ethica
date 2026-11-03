import type { CreateTransaction } from '@ethica/contracts';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '@/components/form-fields.js';
import { expenseCategoryItems, expenseCategoryValue, NEW_EXPENSE_CATEGORY } from '@/components/transaction-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { expenseNamesQuery } from '@/query/transaction.js';

// Expense category (AD-159): the fixed ones, the ones the office already created and "Cadastrar nova
// despesa", which asks for the name. A created one is saved as `other_expenses` with the name.
export function ExpenseCategoryField() {
  const { control, setValue } = useFormContext<CreateTransaction>();
  const [category, categoryName] = useWatch({ control, name: ['category', 'categoryName'] });
  const names = useQuery(expenseNamesQuery);
  const [creating, setCreating] = useState(false);
  const items = expenseCategoryItems(names.data ?? []);
  const value = creating ? NEW_EXPENSE_CATEGORY : expenseCategoryValue(category, categoryName);

  const choose = (chosen: string) => {
    setCreating(chosen === NEW_EXPENSE_CATEGORY);
    if (chosen === NEW_EXPENSE_CATEGORY) {
      setValue('category', 'other_expenses');
      setValue('categoryName', '');
    } else if (chosen.startsWith('name:')) {
      setValue('category', 'other_expenses');
      setValue('categoryName', chosen.slice('name:'.length));
    } else {
      setValue('category', chosen as CreateTransaction['category'], { shouldValidate: true });
      setValue('categoryName', undefined);
    }
  };

  return (
    <>
      <FormField
        control={control}
        name="category"
        render={() => (
          <FormItem>
            <FormLabel>{t('category')}</FormLabel>
            <Select items={items} value={value ?? null} onValueChange={(chosen) => chosen && choose(chosen)}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {creating && (
        <TextField
          control={control}
          name="categoryName"
          label={t('new_expense_name')}
          placeholder={t('example_expense_name')}
        />
      )}
    </>
  );
}
