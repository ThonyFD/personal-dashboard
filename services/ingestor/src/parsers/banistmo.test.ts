import { describe, it, expect } from 'vitest';
import { BanistmoParser } from './banistmo';
import { ParserRegistry } from './index';
import { GmailMessage } from '../types';

const SUBJECT = 'Notificaciones Banistmo';
const SENDER = 'notificaciones@banistmo.com';

function message(internalDate = '1792108313000'): GmailMessage {
  return {
    id: 'msg-1',
    threadId: 'thread-1',
    labelIds: [],
    snippet: '',
    historyId: '1',
    internalDate,
    payload: { headers: [{ name: 'Subject', value: SUBJECT }] },
  } as unknown as GmailMessage;
}

// Trimmed copies of real Banistmo HTML-only notifications (October 2026).
const CARD_PURCHASE_HTML = `
<td><strong>Notificación de Tarjeta Crédito</strong></td>
<td>Hola JUAN PEREZ</td>
<td>
    Banistmo le informa que se ha realizado una transacción con su <strong>Tarjeta Crédito</strong>
    terminada en <strong>2627</strong>, la cual fue <strong>aprobada</strong>.
</td>
<td>
    La información relacionada con esta transacción es:
    <br /><br />
    Lugar: <strong>KFC MARKET PLAZA </strong><br />
    Monto: <strong>USD 23.69</strong><br />
    Número de autorización: <strong>F92222</strong><br />
    Fecha y hora de transacción: <strong>octubre 15 de 2026 6:51 pm</strong>
    <br /><br />
    Tenga presente que este mensaje es solo una notificación de la transacción detectada.
</td>
<td>Banistmo nunca enviará correos solicitando números de tarjetas de crédito, ni de débito.</td>`;

const ACH_SENT_HTML = `
<td><strong>Notificaciones de sus transacciones</strong></td>
<td>
    Banistmo le informa que se ha realizado un(a) Transferencia ACH Express a través de Banistmo App
    Personas por parte de nuestro cliente JUAN PEREZ al beneficiario Maria Lopez .
</td>
<table>
  <tr><td>•</td><td>Cuenta destino: <strong>*1136</strong></td></tr>
  <tr><td>•</td><td>Banco destino: <strong>BANCO GENERAL</strong></td></tr>
  <tr><td>•</td><td>Monto: <strong>USD 78.82</strong></td></tr>
  <tr><td>•</td><td>Número de comprobante - Transacción: <strong>14550622</strong></td></tr>
  <tr><td>•</td><td>Fecha y hora de la transacción: <strong>2026-10-10T18:03:52Z</strong></td></tr>
</table>`;

const ACH_SUCCESS_HTML = `
<td><strong>Tu transferencia fue exitosa</strong></td>
<td>
    Banistmo le informa que la transacción Transferencia ACH Express realizada al beneficiario
    Maria Lopez a la cuenta terminada en *1136 ha sido exitosa.
</td>
<table>
  <tr><td>•</td><td>Monto: <strong>USD 78.82</strong></td></tr>
  <tr><td>•</td><td>Número de comprobante - Transacción: <strong>14550622</strong></td></tr>
</table>`;

const CARD_PAYMENT_HTML = `
<td>Banistmo te informa que se ha realizado un Pago de tarjeta de crédito a través de Banca en línea.</td>
<td>La información relacionada con esta transacción es:
  <ul>
    <li>Producto a pagar: <strong>*2627</strong></li>
    <li>Monto: <strong>USD 300.00</strong></li>
    <li>Número de comprobante - Transacción: <strong>57068049</strong></li>
    <li>Fecha y hora de la transacción: <strong>13-oct-2026 a las 7:55 pm</strong></li>
  </ul>
</td>`;

const LOGIN_HTML = `
<td><strong>Reporte - Inicio de sesión</strong></td>
<td>Estimado(a) JUAN PEREZ, Le reportamos el inicio de sesión en el dispositivo Samsung SM-S928B,
el día 2026-10-13 a las 14:54:53. El inicio se realizó desde la IP 190.140.12.34.</td>`;

describe('BanistmoParser', () => {
  const parser = new BanistmoParser();

  it('parses a credit card purchase from the HTML body', () => {
    const txn = parser.parse(CARD_PURCHASE_HTML, message());
    expect(txn).toMatchObject({
      type: 'purchase',
      channel: 'card',
      amount: 23.69,
      merchant: 'KFC MARKET PLAZA',
      cardLast4: '2627',
    });
  });

  it('parses an outgoing ACH transfer with the beneficiary as merchant', () => {
    const txn = parser.parse(ACH_SENT_HTML, message());
    expect(txn).toMatchObject({
      type: 'transfer',
      channel: 'bank_transfer',
      amount: 78.82,
      merchant: 'Maria Lopez',
      referenceNumber: '14550622',
    });
  });

  it('gives the "transferencia exitosa" confirmation the same reference, so it dedupes', () => {
    const txn = parser.parse(ACH_SUCCESS_HTML, message());
    expect(txn).toMatchObject({ amount: 78.82, merchant: 'Maria Lopez', referenceNumber: '14550622' });
  });

  it('parses a credit card payment', () => {
    const txn = parser.parse(CARD_PAYMENT_HTML, message());
    expect(txn).toMatchObject({
      type: 'payment',
      amount: 300,
      merchant: 'Pago Tarjeta *2627',
      referenceNumber: '57068049',
    });
  });

  it('ignores login alerts', () => {
    expect(parser.shouldIgnore(LOGIN_HTML)).toBe(true);
    expect(parser.shouldIgnore(CARD_PURCHASE_HTML)).toBe(false);
    expect(parser.shouldIgnore(ACH_SENT_HTML)).toBe(false);
  });

  it('cannot extract an amount from the Gmail snippet alone (why HTML is needed)', () => {
    const snippet =
      'Alertas y Notificaciones Notificación de Tarjeta Crédito Hola JUAN PEREZ Banistmo le informa que se ha realizado una transacción con su Tarjeta Crédito terminada en 2627, la cual fue';
    expect(parser.parse(snippet, message())).toBeNull();
  });
});

describe('ParserRegistry HTML body opt-in', () => {
  const registry = new ParserRegistry();

  it('requests the HTML body only for Banistmo', () => {
    expect(registry.detectProvider(message(), SENDER, SUBJECT)).toBe('banistmo');
    expect(registry.wantsHtmlBody('banistmo')).toBe(true);
    expect(registry.wantsHtmlBody('yappy')).toBe(false);
    expect(registry.wantsHtmlBody('bac')).toBe(false);
    expect(registry.wantsHtmlBody(undefined)).toBe(false);
  });

  it('drops Banistmo login alerts without calling the LLM fallback', async () => {
    const result = await registry.parseEmail(LOGIN_HTML, message(), SENDER, SUBJECT);
    expect(result).toBeNull();
  });
});
