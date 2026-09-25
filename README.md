# Model Studio

A simple browser-based machine learning workbench for running classification and regression experiments on CSV files.

## Run the app

1. Open PowerShell in this project folder.
2. Install the dependencies:

```powershell
npm install
```

3. Start the development server:

```powershell
npm run dev
```

4. Open Chrome and visit:

```text
http://localhost:5173/
```

Keep the terminal open while using the app.

## Use the app

1. Upload a `.csv` file or drag it onto the upload area.
2. Choose the target column.
3. Choose `Classification` or `Regression`.
4. Adjust the test split if needed.
5. Select **Run model**.

The app displays a data preview, visualized output, predictions, and model metrics. Classification reports accuracy, precision, recall, and F1 score. Regression reports R², MAE, and RMSE.

All processing happens locally in the browser. Your CSV file is not uploaded to a server.

## CSV requirements

- Include a header row.
- Include at least one data row.
- For classification, the target can contain category labels.
- For regression, the target and at least one feature must contain numeric values.
- Avoid commas inside unquoted cell values.

## Production build

To create a production build:

```powershell
npm run build
```

To preview the production build locally:

```powershell
npm run preview
```
