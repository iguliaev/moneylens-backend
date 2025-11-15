import argparse
import csv
from dataclasses import dataclass, asdict
import json
from typing import Optional, TextIO


@dataclass
class Category:
    type: str
    name: str
    description: Optional[str]


@dataclass
class BankAccount:
    name: str
    description: Optional[str]


@dataclass
class Tag:
    name: str
    description: Optional[str]


@dataclass
class Transaction:
    date: str
    type: str
    category: str
    bank_account: str
    amount: float
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


@dataclass
class Payload:
    categories: Optional[list[Category]] = None
    bank_accounts: Optional[list[BankAccount]] = None
    tags: Optional[list[Tag]] = None
    transactions: Optional[list[Transaction]] = None


def parse_amount(amount_str: str) -> float:
    """
    Parse a string representation of a monetary amount and convert it to a float.
    This function handles various amount formats including:
    - Comma-separated thousands (e.g., "1,000.00")
    - Negative amounts in parentheses (e.g., "(100.00)" becomes -100.00)
    - Whitespace padding
    Args:
        amount_str (str): The string representation of the amount to parse.
    Returns:
        float: The parsed amount as a floating-point number.
    Raises:
        ValueError: If the amount string is empty or has an invalid format
                    that cannot be converted to a float.
    Examples:
        >>> parse_amount("1,234.56")
        1234.56
        >>> parse_amount("(100.00)")
        -100.0
        >>> parse_amount("  50.25  ")
        50.25
    """

    if not amount_str:
        raise ValueError("Amount string is empty")

    cleaned_str = amount_str.replace(",", "").strip()
    if cleaned_str.startswith("("):  # Ensure negative amounts are handled correctly
        cleaned_str = "-" + cleaned_str[1:-1]
    try:
        amount = float(cleaned_str)
    except Exception as e:
        raise ValueError(f"Invalid amount format: {amount_str}") from e

    return amount


class PayloadBuilder:
    """
    A builder class for constructing Payload objects from CSV data.

    This class uses the builder pattern to incrementally construct a Payload by adding
    categories, bank accounts, tags, and transactions. It maintains internal sets to
    prevent duplicate entries for categories, bank accounts, and tags.

    Attributes:
        categories (list): List of Category objects to be included in the payload.
        category_types (set): Set of tuples (name, type) to track unique categories.
        bank_accounts (list): List of BankAccount objects to be included in the payload.
        bank_account_names (set): Set of bank account names to track unique accounts.
        tags (list): List of Tag objects to be included in the payload.
        tag_names (set): Set of tag names to track unique tags.
        transactions (list): List of Transaction objects to be included in the payload.
    """

    def __init__(self):
        """
        Initialize a new PayloadBuilder instance.

        Initializes empty collections for categories, bank accounts, tags, and transactions,
        along with tracking sets to ensure uniqueness.
        """

        self.categories = []
        self.category_types = set()
        self.bank_accounts = []
        self.bank_account_names = set()
        self.tags = []
        self.tag_names = set()
        self.transactions = []

    def add_category(self, category: Category) -> "PayloadBuilder":
        """
        Add a category to the payload.

        Only adds the category if a category with the same name and type doesn't already exist.

        Args:
            category (Category): The category object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        if (category.name, category.type) not in self.category_types:
            self.category_types.add((category.name, category.type))
            self.categories.append(category)
        return self

    def add_bank_account(self, account: BankAccount) -> "PayloadBuilder":
        """
        Add a bank account to the payload.

        Only adds the bank account if an account with the same name doesn't already exist.

        Args:
        account (BankAccount): The bank account object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        if account.name not in self.bank_account_names:
            self.bank_account_names.add(account.name)
            self.bank_accounts.append(account)
        return self

    def add_tag(self, tag: Tag) -> "PayloadBuilder":
        """
        Add a tag to the payload.

        Only adds the tag if a tag with the same name doesn't already exist.

        Args:
            tag (Tag): The tag object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        if tag.name not in self.tag_names:
            self.tag_names.add(tag.name)
            self.tags.append(tag)
        return self

    def add_transaction(self, transaction: Transaction) -> "PayloadBuilder":
        """
        Add a transaction to the payload.

        Transactions are always added without duplication checking.

        Args:
            transaction (Transaction): The transaction object to add.

        Returns:
            PayloadBuilder: Returns self to allow method chaining.
        """

        self.transactions.append(transaction)
        return self

    def build(self) -> Payload:
        """
        Build and return the final Payload object.

        Constructs a Payload object from all the accumulated categories, bank accounts,
        tags, and transactions.

        Returns:
            Payload: A Payload object containing all added data.
        """

        return Payload(
            categories=self.categories,
            bank_accounts=self.bank_accounts,
            tags=self.tags,
            transactions=self.transactions,
        )


class SavingsConverter:
    """
    Converter for transforming savings account CSV files into JSON format.

    This class processes CSV files containing savings transaction data and converts
    them into a structured payload format suitable for the MoneyLens backend.

    Attributes:
        payload_builder (PayloadBuilder): Builder instance for constructing the output payload.
        transaction_type (str): Type of transaction, set to "save" for savings transactions.
        bank_account (BankAccount): Bank account instance representing the savings account.

    Example:
        >>> converter = SavingsConverter("My Savings")
        >>> with open('savings.csv', 'r') as f:
        ...     converter.convert(f)
        >>> payload = converter.get_payload()
    """

    def __init__(self, bank_account_name: str = "Savings Account"):
        self.payload_builder = PayloadBuilder()
        self.transaction_type = "save"
        self.bank_account = BankAccount(bank_account_name, None)

    def convert(self, csv_file: TextIO):
        """
        Convert CSV file data into structured transactions.

        This method reads a CSV file containing transaction data, skips the first 4 header rows,
        and processes each subsequent row to extract transaction information. For each valid row,
        it creates Category and Transaction objects and adds them to the payload builder.

        Args:
            csv_file (TextIO): A file-like object containing CSV data with the following columns:
                - skip1: First column to skip
                - skip2: Second column to skip
                - date: Transaction date
                - amount: Transaction amount
                - category: Category name
                - notes: Transaction notes

        Returns:
            None: This method modifies the payload_builder in place and does not return a value.

        Note:
            - The CSV file is expected to have 4 header rows that are skipped during processing.
            - Only rows with non-empty category_name, date, and amount are processed.
            - The amount is parsed using the parse_amount utility function.
            - All string fields are stripped of leading/trailing whitespace.
        """

        fieldnames = ["skip1", "skip2", "date", "amount", "category", "notes"]
        reader = csv.DictReader(csv_file, fieldnames=fieldnames)

        skip_rows = 4  # Savings CSV has 4 header rows to skip
        for _ in range(skip_rows):
            next(reader)

        for row in reader:
            category_name = row.get("category", "").strip()
            date = row.get("date", "").strip()
            amount = parse_amount(row.get("amount", "").strip())
            notes = row.get("notes", "").strip()
            notes = notes if notes else None

            if category_name and date:
                self.payload_builder.add_category(
                    Category(
                        type=self.transaction_type,
                        name=category_name,
                        description=None,
                    ),
                ).add_bank_account(
                    self.bank_account,
                ).add_transaction(
                    Transaction(
                        date=date,
                        amount=amount,
                        notes=notes,
                        category=category_name,
                        bank_account=self.bank_account.name,
                        tags=None,
                        type=self.transaction_type,
                    ),
                )

    def get_payload(self) -> Payload:
        return self.payload_builder.build()


def exclude_if_none_factory(value):
    """
    Factory function that creates a dictionary from an iterable of key-value pairs, excluding entries where the value is None.

    Args:
        value: An iterable of tuples containing (key, value) pairs.

    Returns:
        dict: A dictionary containing only the key-value pairs where the value is not None.

    Example:
        >>> exclude_if_none_factory([('a', 1), ('b', None), ('c', 3)])
        {'a': 1, 'c': 3}
    """
    return {k: v for (k, v) in value if v is not None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert CSV to JSON")
    parser.add_argument(
        "-i", "--input", required=True, help="Path to the input CSV file"
    )
    parser.add_argument("-o", "--output", help="Path to the output JSON file")
    args = parser.parse_args()

    converter = SavingsConverter()

    try:
        with open(args.input, mode="r", encoding="utf-8") as csv_file:
            converter.convert(csv_file)
            payload = converter.get_payload()
            json_string = json.dumps(
                asdict(payload, dict_factory=exclude_if_none_factory),
                indent=2,
            )
            if args.output:
                with open(args.output, mode="w", encoding="utf-8") as json_file:
                    json_file.write(json_string)
            else:
                print(json_string)
    except Exception as e:
        print(f"An error occurred: {e}")